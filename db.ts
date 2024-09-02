import { Database } from "bun:sqlite";

export interface ScheduledMessage {
    id: number;
    message: string;
    schedule_time: string;
    chat_id: number;
    job_id: string;
}

let db: Database;

export async function initDb() {
    db = new Database(process.env.DB_PATH || "scheduled_messages.sqlite", {
        create: true,
        strict: true,
    })

    db.run(`CREATE TABLE IF NOT EXISTS scheduled_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT,
            schedule_time TEXT,
            chat_id TEXT,
            job_id TEXT)`);
    return db
}

export async function storeScheduledMessage(message: string, scheduleTime: Date, chatId: number, jobId: string) {
    const insert = db.query(
        'INSERT INTO scheduled_messages (message, schedule_time, chat_id, job_id) VALUES ($message, $scheduleTime, $chatId, $jobId)',
    );
    return insert.run({
        message,
        scheduleTime: scheduleTime.toString(),
        chatId,
        jobId,
    })
}

export async function getScheduledMessages(): Promise<ScheduledMessage[]> {
    const query =  db.query(
        'SELECT * FROM scheduled_messages ORDER BY schedule_time',
    );
    const messages = query.all()
    return messages as ScheduledMessage[]
}

export async function getScheduledMessagesOfChat(chatId: number) {
    const query =  db.query(
        'SELECT * FROM scheduled_messages WHERE chat_id = $chatId ORDER BY schedule_time',
    );
    const messages = query.all({ chatId })
    return messages as ScheduledMessage[]
}

export async function deleteScheduledMessage(jobId: string) {
    const query = db.query('DELETE FROM scheduled_messages WHERE job_id = $jobId');
    return query.run({ jobId })
}