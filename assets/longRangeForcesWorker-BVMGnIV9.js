(function(){"use strict";self.onmessage=m=>{const{atoms:e,neighbors:h,G:M,k:f}=m.data,l=.1,n={},b=new Map(e.map(o=>[o.id,o])),F=new Map(h.map(o=>[o.id,o.neighbors])),r=new Set;for(const o of e){const u=n[o.id]||[0,0,0],w=F.get(o.id)||[];for(const I of w){const s=b.get(I),p=[o.id,s.id].sort().join("-");if(r.has(p))continue;r.add(p);const c=[s.position[0]-o.position[0],s.position[1]-o.position[1],s.position[2]-o.position[2]],i=Math.max(Math.sqrt(c[0]**2+c[1]**2+c[2]**2),l),v=M*o.mass*s.mass/(i*i),D=f*o.charge*s.charge/(i*i),d=c.map(t=>t/i),N=d.map(t=>t*v),S=d.map(t=>t*D),g=N.map((t,a)=>t+S[a]);n[o.id]=u.map((t,a)=>t+g[a]),n[s.id]=(n[s.id]||[0,0,0]).map((t,a)=>t-g[a])}}postMessage(n)}})();
