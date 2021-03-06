# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2017-01-21 00:31
from __future__ import unicode_literals

from django.db import migrations
from django.conf import settings


def appserver_is_shut_down(appserver):
    """
    Return True if `appserver` has been terminated
    or if it failed to provision and the corresponding VM has since been terminated.
    """
    if appserver._status == 'terminated':
        return True
    configuration_failed = (appserver._status == 'failed' or appserver._status == 'error')
    vm_terminated = appserver.server._status == 'terminated'
    return configuration_failed and vm_terminated


def persist_archived_status(apps, schema_editor):
    """
    Until migration 0080, OpenCraft IM did not have the concept of
    archived instances, and instead used a dynamic 'is_shut_down'
    property, which was inefficient to query when the number of
    instances grew large.

    When updating an existing installation to use is_archived, we
    have to guess which instances were previously returning
        instance.is_shut_down() == True
    and then mark those instances as is_archived=True
    """
    ContentType = apps.get_model("contenttypes", "ContentType")
    openedx_instance_type = ContentType.objects.get_for_model(apps.get_model('instance', 'openedxinstance'))
    OpenEdXInstance = apps.get_model("instance", "OpenEdXInstance")
    InstanceReference = apps.get_model("instance", "InstanceReference")

    for instance in OpenEdXInstance.objects.all():
        instance_ref = InstanceReference.objects.get(instance_id=instance.pk, instance_type=openedx_instance_type)
        appservers = instance_ref.openedxappserver_set.all()
        if len(appservers) == 0:
            continue  # This is probably a new instance, and we haven't provisioned it any appserver yet.
        all_appservers_terminated = all(appserver_is_shut_down(appserver) for appserver in appservers)
        if all_appservers_terminated:
            instance_ref.is_archived = True
            instance_ref.save()


class Migration(migrations.Migration):

    dependencies = [
        ('instance', '0080_is_archived'),
    ]

    operations = [
        migrations.RunPython(persist_archived_status),
    ]
