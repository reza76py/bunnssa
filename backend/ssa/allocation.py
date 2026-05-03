import logging
import math

import requests
from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils.timezone import localdate
from .models import Store, Supervisor, Member, AllocationResult, StoreAssignment, MemberAssignment

logger = logging.getLogger(__name__)

OSRM_URL = 'http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false'


def _haversine_km(lat1, lon1, lat2, lon2):
    """Straight-line Haversine distance in km — used as fallback only."""
    R = 6371
    d_lat = math.radians(float(lat2) - float(lat1))
    d_lon = math.radians(float(lon2) - float(lon1))
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(float(lat1))) *
         math.cos(math.radians(float(lat2))) *
         math.sin(d_lon / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def road_distance_km(lat1, lon1, lat2, lon2):
    """Return real road distance in km via OSRM public API.
    Falls back to Haversine if the request fails or returns no routes.
    """
    try:
        url = OSRM_URL.format(
            lng1=float(lon1), lat1=float(lat1),
            lng2=float(lon2), lat2=float(lat2),
        )
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get('code') == 'Ok' and data.get('routes'):
            meters = data['routes'][0]['distance']
            return round(meters / 1000, 2)
    except Exception:
        pass
    return _haversine_km(lat1, lon1, lat2, lon2)


def calculate_store_member_targets(stores, total_members):
    if not stores or total_members <= 0:
        return {store.id: 0 for store in stores}

    total_value = sum(float(store.weekly_delivery_value) for store in stores)
    if total_value <= 0:
        return {store.id: 0 for store in stores}

    raw_targets = []
    for store in stores:
        share = float(store.weekly_delivery_value) / total_value * total_members
        target = max(1, round(share))
        raw_targets.append({
            'store_id': store.id,
            'target': target,
            'share': share,
            'fraction': share - math.floor(share),
            'value': float(store.weekly_delivery_value),
        })

    target_sum = sum(item['target'] for item in raw_targets)

    if total_members >= len(stores):
        while target_sum > total_members:
            candidates = [item for item in raw_targets if item['target'] > 1]
            if not candidates:
                break
            candidate = min(candidates, key=lambda item: (item['fraction'], item['value'], item['store_id']))
            candidate['target'] -= 1
            target_sum -= 1

        while target_sum < total_members:
            candidate = max(raw_targets, key=lambda item: (item['fraction'], item['value'], -item['store_id']))
            candidate['target'] += 1
            target_sum += 1

    return {item['store_id']: item['target'] for item in raw_targets}


def run_allocation(notes='', user=None):
    """
    Core allocation algorithm:
    1. Select top N stores by weekly delivery value (N = number of supervisors)
    2. Assign closest supervisor to each selected store
    3. Distribute all members proportionally across selected stores by weekly value
    4. Assign closest available members to each store
    """
    supervisors = list(Supervisor.objects.filter(created_by=user))
    members = list(Member.objects.filter(created_by=user))
    stores = list(Store.objects.filter(created_by=user).order_by('-weekly_delivery_value'))

    if not supervisors:
        raise ValueError("No supervisors available.")
    if not stores:
        raise ValueError("No stores available.")

    print("=== STEP 1: Selecting top stores ===")
    n = len(supervisors)
    top_stores = stores[:n]
    member_targets = calculate_store_member_targets(top_stores, len(members))

    result = AllocationResult.objects.create(notes=notes, created_by=user)

    used_supervisors = set()
    used_members = set()

    print("=== STEP 2: Assigning supervisors ===")
    for store in top_stores:
        # Find closest available supervisor
        best_sup = None
        best_sup_dist = float('inf')
        for sup in supervisors:
            if sup.id in used_supervisors:
                continue
            d = road_distance_km(store.latitude, store.longitude, sup.latitude, sup.longitude)
            if d < best_sup_dist:
                best_sup_dist = d
                best_sup = sup

        if best_sup is None:
            continue

        used_supervisors.add(best_sup.id)
        assignment = StoreAssignment.objects.create(
            allocation=result,
            store=store,
            supervisor=best_sup,
            supervisor_distance_km=best_sup_dist,
        )

        print("=== STEP 3: Assigning members ===")
        # Find closest available members using the proportional target for this store.
        needed = member_targets.get(store.id, 0)
        candidates = []
        for m in members:
            if m.id in used_members:
                continue
            d = road_distance_km(store.latitude, store.longitude, m.latitude, m.longitude)
            candidates.append((d, m))
        candidates.sort(key=lambda x: x[0])

        for dist, member in candidates[:needed]:
            used_members.add(member.id)
            MemberAssignment.objects.create(
                store_assignment=assignment,
                member=member,
                distance_km=dist,
            )

    print("=== STEP 4: Sending emails ===")
    _send_allocation_emails(result)
    return result


def _send_allocation_emails(result):
    """Send assignment notification emails to every supervisor and member.
    Failures for individual recipients are logged but never raise so the
    allocation result is always returned to the caller.
    """
    smtp_sender = settings.EMAIL_HOST_USER
    creator_email = (result.created_by.email or '').strip()
    creator_name = (result.created_by.first_name or result.created_by.username or 'there').strip()

    from_email = smtp_sender
    reply_to = []

    if creator_email:
        reply_to = [creator_email]

    print(f"[EMAIL] Starting email dispatch for allocation #{result.id}")
    print(f"[EMAIL] EMAIL_HOST_USER configured: {bool(smtp_sender)}")
    print(f"[EMAIL] Display FROM set to: {from_email}")
    print(f"[EMAIL] Reply-To set to: {reply_to[0] if reply_to else '[NONE]'}")

    if not smtp_sender:
        print('[EMAIL] Skipping all emails because EMAIL_HOST_USER is empty.')
        logger.warning('EMAIL_HOST_USER is empty. Skipping allocation emails for user=%s', result.created_by_id)
        return

    connection = get_connection()
    connection.open()

    def _send_via_central_smtp(subject, message, recipient):
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=from_email,
            to=[recipient],
            reply_to=reply_to,
            connection=connection,
            headers={'Sender': smtp_sender},
        )

        mime_message = email.message()
        connection.connection.sendmail(
            smtp_sender,
            email.recipients(),
            mime_message.as_bytes(linesep='\r\n'),
        )

    assignments = result.assignments.select_related(
        'store', 'supervisor'
    ).prefetch_related('member_assignments__member')

    assignment_count = assignments.count()
    print(f"[EMAIL] Assignments to process: {assignment_count}")
    summary_store_lines = []
    total_weekly_value = 0
    total_members_deployed = 0

    for assignment in assignments:
        store = assignment.store
        supervisor = assignment.supervisor
        total_weekly_value += float(store.weekly_delivery_value)
        print(
            f"[EMAIL] Processing store='{store.name}' supervisor='{supervisor.name}' "
            f"supervisor_email='{supervisor.email or '[EMPTY]'}'"
        )

        assignment_members = list(assignment.member_assignments.all())
        total_members_deployed += len(assignment_members)
        member_lines = [
            f'  - {ma.member.name} ({ma.distance_km} km from store)'
            for ma in assignment_members
        ] or ['  No team members assigned']

        summary_member_lines = [
            f'- {ma.member.name} ({ma.distance_km} km)'
            for ma in assignment_members
        ] or ['No members assigned']
        summary_store_lines.append(
            (
                f'📍 {store.name} (${float(store.weekly_delivery_value):,.0f}/wk)\n'
                f'   Supervisor: {supervisor.name} ({assignment.supervisor_distance_km} km)\n'
                '   Members:\n'
                + '\n'.join(f'   {line}' for line in summary_member_lines)
            )
        )

        # ── Supervisor email ──────────────────────────────────────────────
        if supervisor.email:
            email_address = supervisor.email
            try:
                print(f"=== Sending to supervisor: {supervisor.email} ===")
                print(f"=== ATTEMPTING EMAIL TO: {email_address} ===")
                _send_via_central_smtp(
                    subject='Bunnings SSA - Your Store Assignment',
                    message=(
                        f'Hi {supervisor.name},\n\n'
                        f'You have been assigned to the following store for this allocation:\n\n'
                        f'Store: {store.name}\n'
                        f'Weekly Delivery Value: ${float(store.weekly_delivery_value):,.2f}\n\n'
                        f'Team members who will assist you:\n'
                        + '\n'.join(member_lines) +
                        '\n\nRegards,\nBunnings SSA'
                    ),
                    recipient=email_address,
                )
                print("SUCCESS")
                print(f"=== EMAIL SENT SUCCESSFULLY TO: {email_address} ===")
                logger.info('Sent assignment email to supervisor %s <%s>', supervisor.name, supervisor.email)
            except Exception as exc:
                print(f"EMAIL FAILED: {str(exc)}")
                logger.error(
                    'Failed to send email to supervisor %s <%s>: %s',
                    supervisor.name, supervisor.email, exc,
                )
        else:
            print(f"[EMAIL] Skipping supervisor '{supervisor.name}' because email is empty")

        # ── Member emails ─────────────────────────────────────────────────
        for ma in assignment.member_assignments.all():
            member = ma.member
            if not member.email:
                print(f"[EMAIL] Skipping member '{member.name}' because email is empty")
                continue
            email_address = member.email
            try:
                print(f"=== Sending to member: {member.email} ===")
                print(f"=== ATTEMPTING EMAIL TO: {email_address} ===")
                _send_via_central_smtp(
                    subject='Bunnings SSA - Your Assignment This Week',
                    message=(
                        f'Hi {member.name},\n\n'
                        f'You have been assigned to the following store for this allocation:\n\n'
                        f'Store: {store.name}\n'
                        f'Distance from your home: {ma.distance_km} km\n'
                        f'Supervisor: {supervisor.name}\n\n'
                        f'Regards,\nBunnings SSA'
                    ),
                    recipient=email_address,
                )
                print("SUCCESS")
                print(f"=== EMAIL SENT SUCCESSFULLY TO: {email_address} ===")
                logger.info('Sent assignment email to member %s <%s>', member.name, member.email)
            except Exception as exc:
                print(f"EMAIL FAILED: {str(exc)}")
                logger.error(
                    'Failed to send email to member %s <%s>: %s',
                    member.name, member.email, exc,
                )

    if creator_email:
        try:
            summary_body = (
                f'Hi {creator_name},\n\n'
                'Your allocation has been completed successfully.\n'
                'Here is a summary:\n\n'
                + '\n\n'.join(summary_store_lines) +
                f'\n\nTotal: {assignment_count} stores, ${total_weekly_value:,.0f} weekly value\n'
                f'{total_members_deployed} members deployed\n\n'
                'Regards,\n'
                'Staff Allocation System'
            )
            summary_email = EmailMessage(
                subject=f'Staff Allocation Summary - {localdate().isoformat()}',
                body=summary_body,
                from_email=from_email,
                to=[creator_email],
                reply_to=[smtp_sender],
                connection=connection,
                headers={'Sender': smtp_sender},
            )
            summary_mime_message = summary_email.message()
            connection.connection.sendmail(
                smtp_sender,
                summary_email.recipients(),
                summary_mime_message.as_bytes(linesep='\r\n'),
            )
            logger.info('Sent allocation summary email to creator %s <%s>', result.created_by.username, creator_email)
        except Exception as exc:
            print(f"SUMMARY EMAIL FAILED: {str(exc)}")
            logger.error(
                'Failed to send allocation summary email to creator %s <%s>: %s',
                result.created_by.username,
                creator_email,
                exc,
            )

    print(f"[EMAIL] Email dispatch finished for allocation #{result.id}")

    try:
        connection.close()
    except Exception:
        pass
