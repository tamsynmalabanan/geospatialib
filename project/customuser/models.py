from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.db import models
from django.utils.text import slugify

from random_username.generate import generate_username

from . import validators

class UserManager(BaseUserManager):

    def username_is_available(self, username, user_pk=None):
        user_query = self.filter(username__iexact=username)
        if user_pk:
            user_query = user_query.exclude(pk=user_pk)
        return not user_query.exists()

    def generate_random_username(self, user_pk=None):
        while True:
            username = slugify(generate_username(1)[0]).lower()
            if self.username_is_available(username, user_pk):
                break
        return username

    def create_user(self, email, username:str=None, password=None, **kwargs):
        if not email:
            raise ValueError("User must have an email address.")
        email = self.normalize_email(email)

        if username: 
            username = username.lower()
            if not self.username_is_available(username):
                raise ValueError('Username is not available.')
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
    username = models.SlugField('Username', unique=True, validators=[validators.validate_username])
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    joined_on = models.DateTimeField('Join date', auto_now_add=True)
    first_name = models.CharField('First name', max_length=32, blank=True, null=True)
    last_name = models.CharField('Last name', max_length=32, blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self) -> str:
        names = [name for name in [self.first_name, self.last_name] if name]
        return ' '.join(names) if names else self.username

    @property
    def has_no_password(self):
        return self.password.startswith(UNUSABLE_PASSWORD_PREFIX)