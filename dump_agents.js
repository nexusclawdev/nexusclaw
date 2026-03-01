
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('nexusclaw.db');
const agents = db.prepare("SELECT * FROM agents").all();
console.log(JSON.stringify(agents, null, 2));
db.close();
