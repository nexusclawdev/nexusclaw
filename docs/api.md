# NexusClaw API Reference

This document outlines the primary REST and WebSocket endpoints available via the `nexusclaw gateway`.

## REST API Endpoints

### `GET /api/agents`

Retrieve a list of all active agents.

**Parameters:**
None.

**Response:**
- `200`: `{ agents: Agent[] }`

**Example:**
```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Frontend Expert",
      "status": "idle"
    }
  ]
}
```

---

### `POST /api/tasks`

Create a new task in the system.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | The title of the task |
| description | string | No | Task detailed context |
| priority | number | No | Task priority level |
| department_id | string | No | Department to send task to |

**Response:**
- `200`: `{ id: "task-1", task: TaskObject }`

**Example:**
```json
{
  "id": "task-12345",
  "task": {
    "title": "Refactor UI",
    "status": "inbox"
  }
}
```

---

### `GET /api/skills`

Retrieve the list of installed and available skills from the marketplace.

**Parameters:**
None.

**Response:**
- `200`: `{ skills: MockSkill[], installed: InstalledSkill[] }`

---

## WebSocket Connections

### `WS /ws`

Main websocket connection for realtime dashboard communication.

**Events Broadcasted:**
- `new_message`: Chat messages and notifications.
- `task_created` / `task_updated`: Live task status changes.
- `agent_created` / `agent_updated`: Realtime agent metric updates.

**Example Payload:**
```json
{
  "type": "connection_established",
  "data": { "ok": true },
  "timestamp": "2026-02-24T10:00:00Z"
}
```
