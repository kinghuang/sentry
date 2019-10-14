from __future__ import absolute_import

from django.apps import AppConfig


class PluginsSentryUseragentsAppConfig(AppConfig):
    name = "sentry.plugins.sentry_useragents"

    def ready(self):
        from .models import BrowserPlugin, OsPlugin, DevicePlugin
        from sentry.plugins import register

        register(BrowserPlugin)
        register(OsPlugin)
        register(DevicePlugin)
