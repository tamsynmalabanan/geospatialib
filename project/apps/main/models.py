from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.utils.text import slugify
from django.db.models import Q, Subquery, OuterRef, Value, IntegerField, Case, When
from django.db.models.functions import Coalesce

from random_username.generate import generate_username

from .validators import validate_username
from apps.helpers.models import BaseModel

class UserManager(BaseUserManager):

    def username_is_valid(self, username, user_pk=None):
        try:
            validate_username(username)
        except Exception as e:
            return False
        
        user_query = self.filter(username__iexact=username)
        if user_pk:
            user_query = user_query.exclude(pk=user_pk)
        return not user_query.exists()

    def generate_random_username(self, user_pk=None):
        while True:
            username = slugify(generate_username(1)[0]).lower()
            if self.username_is_valid(username, user_pk):
                break
        return username

    def create_user(self, email, username:str=None, password=None, **kwargs):
        if not email:
            raise ValueError("User must have an email address.")
        email = self.normalize_email(email)

        if username: 
            username = username.lower()
            if not self.username_is_valid(username):
                raise ValueError('Username is not valid.')
        else:
            username = self.generate_random_username()

        user = User(email=email, username=username, **kwargs)
        user.set_password(password)
        user.save()
        
        return user
    
    def create_superuser(self, email, username=None, password=None, **kwargs):
        if password is None:
            raise ValueError('Password is required.')
        
        for field in ['is_active', 'is_staff', 'is_superuser']:
            kwargs.setdefault(field, True)        
            if kwargs.get(field) is not True:
                raise ValueError(f'Field "{field}" must be set as True.')
        
        return self.create_user(email, username, password, **kwargs)
    
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField('Email', unique=True)
    username = models.SlugField('Username', unique=True, validators=[validate_username])
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    join_date = models.DateTimeField('Join date', auto_now_add=True)
    first_name = models.CharField('First name', max_length=32, blank=True, null=True)
    last_name = models.CharField('Last name', max_length=32, blank=True, null=True)
    is_premium = models.BooleanField('Is premium', default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self) -> str:
        names = [name for name in [self.first_name, self.last_name] if name]
        return ' '.join(names) if names else self.username

    @property
    def has_no_password(self):
        return self.password.startswith(UNUSABLE_PASSWORD_PREFIX)
    
    @property
    def projects(self):
        user_rank_qs = Role.objects.filter(
            project=OuterRef("pk"),
            user=self
        ).values("rank")[:1]

        return Project.objects.filter(
            Q(owner=self) | Q(role__is_active=True, role__user=self)
        ).distinct().annotate(
            user_rank=Case(
                When(owner=self, then=Value(0)),
                default=Subquery(user_rank_qs, Value(-1)),
                output_field=IntegerField(),
            )
        ).exclude(user_rank=-1).order_by("user_rank")
    
class Project(BaseModel):
    title = models.CharField('Title', max_length=50, default='New Project')
    owner = models.ForeignKey("main.User", verbose_name='Owner', on_delete=models.PROTECT)
    is_private = models.BooleanField('Is private', default=True)
    layouts = models.ManyToManyField('helpers.Layout', verbose_name='Layouts', blank=True)

class Role(BaseModel):
    project = models.ForeignKey("main.Project", verbose_name='Project', on_delete=models.CASCADE)
    user = models.ForeignKey("main.User", verbose_name='User', on_delete=models.CASCADE)
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
