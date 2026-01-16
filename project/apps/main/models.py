from django.contrib.gis.db import models
from apps.helpers.models import BaseModel

class Project(BaseModel):
    title = models.CharField('Title', max_length=50, default='New Project')
    owner = models.ForeignKey("customuser.User", verbose_name='Owner', on_delete=models.PROTECT)
    is_private = models.BooleanField('Is private', default=True)
    layouts = models.ManyToManyField('helpers.Layout', verbose_name='Layouts', blank=True)

class Role(BaseModel):
    project = models.ForeignKey("main.Project", verbose_name='Project', on_delete=models.CASCADE)
    user = models.ForeignKey("customuser.User", verbose_name='User', on_delete=models.CASCADE)
    rank = models.SmallIntegerField('Rank', choices=[
        [1, 'Admin'],
        [2, 'Contributor'],
        [3, 'Member'],
    ])

    class Meta:
        unique_together = ['project', 'user']

    @property
    def rank_title(self):
        if self.user == self.project.owner:
            return 'Owner'
        return [
            i[1] for i in Role._meta.get_field('rank').choices 
            if i[0] == self.rank
        ][0]

class Invite(BaseModel):
    role = models.ForeignKey("main.Role", verbose_name='Role', on_delete=models.CASCADE)
    status = models.SmallIntegerField('Status', choices=[
        [1, 'Accepted'],
        [2, 'Pending'],
        [3, 'Declined'],
    ])

    @property
    def status_title(self):
        return [
            i[1] for i in Invite._meta.get_field('status').choices 
            if i[0] == self.rank
        ][0]
