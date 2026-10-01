"""Copy validated genus data to the site's hyphenated filename contract."""
import json
from pathlib import Path

root=Path(__file__).resolve().parent
source=root/'data';target=root.parent/'data';target.mkdir(parents=True,exist_ok=True)
available=[]
for genus in range(2,101):
    src=source/f'g{genus}.json'
    if not src.exists():break
    data=json.loads(src.read_text())
    reports=[]
    for k in range(1,genus+1):
        p=source/f'tracking{k}.json'
        if p.exists():reports.append(json.loads(p.read_text()))
    if len(reports)==genus:
        assert all(not r['cross_color_midpoint_mismatches'] and not r['conjugate_color_errors'] for r in reports)
        data['validation'].update(midpointColorTrackingVerified=True,
                                  positiveIntervalsCheckedPerCore=reports[0]['intervals_checked'],
                                  conjugateTerminalColorsVerified=True)
    (target/f'g-{genus}.json').write_text(json.dumps(data,separators=(',',':')))
    available.append(genus)
(target/'manifest.json').write_text(json.dumps({'gValues':available,'minimumRho':.0001,'maximumRho':1,'q':1}))
print('Installed genera:',available)
