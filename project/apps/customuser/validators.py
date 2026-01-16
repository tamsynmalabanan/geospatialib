from django.core.exceptions import ValidationError

USERNAME_BLACKLIST = [
    'admin', 
    'user', 
    'name', 
    'username', 
    'test', 
]

def validate_username(username):
    if len(username) < 3:
        raise ValidationError('Username must be at least 3 characters.')
    
    if username.lower() in USERNAME_BLACKLIST:
        raise ValidationError('Username is not allowed.')