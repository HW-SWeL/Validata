import json

open('out.ttl', 'w').write(json.dumps({'ttl':open('in.ttl').read()}))


