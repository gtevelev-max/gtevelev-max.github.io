import {makeMesh} from './mesh.mjs';
self.onmessage=event=>{try {const result=makeMesh(event.data);self.postMessage(result,[result.positions.buffer,result.normals.buffer]);}catch(error){self.postMessage({error:error.message});}};
