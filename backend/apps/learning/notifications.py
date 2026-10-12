"""Private, preference-aware event notifications; destinations are local app paths."""
from itertools import islice
from apps.accounts.models import User
from .models import Notification


def notify_event(institute,users,title,body="",*,event_key=None,destination=""):
    if destination and (len(destination)>300 or not destination.startswith("/") or destination.startswith("//") or "\\" in destination or any(c.isspace() or ord(c)<32 for c in destination)):
        raise ValueError("Notification destinations must be local application paths")
    if not institute.active:return
    recipients=User.objects.filter(pk__in=set(users),is_active=True,notify_academic=True,membership__institute=institute,membership__active=True).distinct().values_list("pk",flat=True).iterator(chunk_size=500)
    while batch:=list(islice(recipients,500)):
        Notification.objects.bulk_create([Notification(institute=institute,user_id=user,title=title[:180],body=body,event_key=event_key,destination=destination) for user in batch],ignore_conflicts=True)
