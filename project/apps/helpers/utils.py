from urllib.parse import urlparse
from rapidfuzz import fuzz
import re
    
def is_tiles_url(url):
    pattern = re.compile(r"(?:\{[^}]+\}|%7B[^%]+%7D)")
    return bool(pattern.search(url))

def get_best_match(text:str, options:dict) -> str:
    best_score = 0
    best_option = ''

    text_lower = text.lower()

    for option, keywords in options.items():
        score = 0
        
        for kw in [option]+keywords:
            score = max([score, fuzz.partial_ratio(text_lower, kw.lower())])
            if score == 100:
                return option
            
        if score > best_score:
            best_score = score
            best_option = option

    return best_option if best_score > 75 else ''

