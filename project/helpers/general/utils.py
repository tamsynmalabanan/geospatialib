from django.utils.text import slugify

import string
import random

def get_special_characters(value):
    scs = (list(string.punctuation) + [' '])
    return list(set(char for char in value if char in scs))

def split_by_special_characters(value, excluded_chars=[]):
    special_chars = [sc for sc in get_special_characters(value) if sc not in excluded_chars]
    if len(special_chars) == 0: 
        return [value]
    
    delimiter = random.choice(special_chars)
    for sc in special_chars:
        if (sc == delimiter):
            continue
        value = value.replace(sc, delimiter)

    return [i for i in value.split(delimiter) if i != '']

def get_first_substring_match(value, choices={}, case_sensitive=False):
    if '' in choices:
        del choices['']

    if not case_sensitive: 
        value = value.lower()
        for key, keywords in choices.items():
            choices[key] = list(set([i.lower() for i in keywords]))

    current_key = None
    current_len = 0
    for key in choices.keys():
        key_input = key if case_sensitive else key.lower()
        if key_input in value:
            return key
        else:
            sections = split_by_special_characters(key_input)
            match_len = len([i for i in sections if i in value])
            if match_len > current_len:
                current_len = match_len
                current_key = key

    if not current_key:
        current_per = 0
        for key, keywords in choices.items():
            matches = [i for i in keywords if i in value]
            per = len(matches) / len(keywords)
            if per == 1.0   :
                return key
            if per > current_per:
                current_per = per
                current_key = key

    return current_key

def create_cache_key(values):
    return slugify([str(i) for i in values].join(';'))