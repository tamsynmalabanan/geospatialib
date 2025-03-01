from collections import OrderedDict

def dict_to_choices(dict, blank_choice=None, sort=False):
    dict_copy = {'':str(blank_choice)} if blank_choice is not None else {}

    for key, value in dict.items():
        try:
            dict_copy[key] = str(value)
        except Exception as e:
            print('ERROR with dict_to_choices: ', e)

    if sort:
        dict_copy = OrderedDict(sorted(dict_copy.items(), key=lambda item: item[1]))
    
    return [(key, value) for key, value in dict_copy.items()]