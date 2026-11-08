# Compare two records of the grand from tests/grand-baseline.cjs: the panel text, header, tabs, a strike's events and
# page errors must match; the pictures are compared pixel by pixel (two runs of the same code differ only where
# something animates, by a few levels). /usr/bin/python3 tests/grand-compare.py <before_dir> <after_dir>
import json, os, sys
from PIL import Image, ImageChops

a, b = sys.argv[1], sys.argv[2]
ra, rb = (json.load(open(os.path.join(d, 'record.json'))) for d in (a, b))
bad = [k for k in ra if ra[k] != rb.get(k)]
for k in bad: print(f'DIFFERS {k}\n  before: {str(ra[k])[:300]}\n  after:  {str(rb.get(k))[:300]}')
for f in sorted(x for x in os.listdir(a) if x.endswith('.png')):
    d = ImageChops.difference(Image.open(os.path.join(a, f)).convert('RGB'), Image.open(os.path.join(b, f)).convert('RGB')).convert('L')
    h = d.histogram()
    print(f'{f}: {sum(h[3:])} pixels differ by more than 2 levels, most {max(i for i, n in enumerate(h) if n) if sum(h[1:]) else 0}')
print('records match' if not bad else f'{len(bad)} records differ')
sys.exit(1 if bad else 0)
