(function(){"use strict";self.onmessage=n=>{const{atoms:o,cutoff:a}=n.data,t={};for(const i of o){const e=o.filter(s=>s.id===i.id?!1:Math.sqrt((i.position[0]-s.position[0])**2+(i.position[1]-s.position[1])**2+(i.position[2]-s.position[2])**2)<=a).map(s=>s.id);t[i.id]=e}postMessage(t)}})();