from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Institute, Membership

admin.site.register(User, UserAdmin)
admin.site.register(Institute)
admin.site.register(Membership)
