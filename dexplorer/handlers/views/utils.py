

def smart_truncate(content, length=100, suffix='...'):
    return content if len(content) <= length else content[:length + 1] + suffix
