import { Database } from './src/db/database.js';

const db = new Database('./.nexus_storage');
const skills = db.getLearnedSkills();

console.log('--- Learned Skills ---');
if (skills.length === 0) {
    console.log('No skills have been learned yet.');
} else {
    for (const skill of skills) {
        console.log(`- ${skill.provider} learned ${skill.skill_id} from ${skill.repo}`);
    }
}
db.close();
