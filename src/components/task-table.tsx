import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Flex,
} from "@/components/ui";
import { Avatar, EmptyState, Status } from "@/components/ui";
import { DoneCheck, StatusSelect } from "@/components/boards";
import { FormModal, type Option } from "@/components/forms";
import { saveTask, setTaskStatus } from "@/app/actions";
import { taskFields } from "@/lib/fields";
import { opts, TASK_STATUS } from "@/lib/constants";
import { dueState, fmtShort } from "@/lib/dates";

export function TaskTable({
  tasks,
  projects,
  members,
  canWrite,
  showProject = true,
  me,
  isAdmin,
}: {
  tasks: any[];
  projects: Option[];
  members: Option[];
  canWrite: boolean;
  showProject?: boolean;
  me: string;
  isAdmin: boolean;
}) {
  if (!tasks.length)
    return (
      <EmptyState title="No tasks" text="Nothing matches these filters." />
    );
  return (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th w="30px" />
            <Th>Task</Th>
            {showProject && <Th>Project</Th>}
            <Th>Assignee</Th>
            <Th>Priority</Th>
            <Th>Due</Th>
            <Th>Status</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {tasks.map((t) => {
            const s = dueState(t.due_date, t.status === "done");
            const mine = isAdmin || t.assignee_id === me;
            return (
              <Tr key={t.id}>
                <Td>
                  {canWrite && mine ? (
                    <DoneCheck
                      id={t.id}
                      done={t.status === "done"}
                      action={setTaskStatus}
                    />
                  ) : null}
                </Td>
                <Td
                  fontWeight={600}
                  textDecoration={
                    t.status === "done" ? "line-through" : undefined
                  }
                  color={t.status === "done" ? "mute" : undefined}
                >
                  {t.title}
                </Td>
                {showProject && <Td color="mute">{t.project_name}</Td>}
                <Td>
                  {t.assignee_name ? (
                    <Flex align="center" gap={2}>
                      <Avatar name={t.assignee_name} />
                      <Text display={{ base: "none", xl: "block" }}>
                        {t.assignee_name}
                      </Text>
                    </Flex>
                  ) : (
                    <Text color="mute">Unassigned</Text>
                  )}
                </Td>
                <Td>
                  <Status value={t.priority} />
                </Td>
                <Td
                  fontFamily="mono"
                  fontSize="12px"
                  color={
                    s === "overdue"
                      ? "danger"
                      : s === "today"
                        ? "warn"
                        : undefined
                  }
                >
                  {fmtShort(t.due_date)}
                  {s === "overdue"
                    ? " · overdue"
                    : s === "today"
                      ? " · today"
                      : ""}
                </Td>
                <Td>
                  {canWrite && mine ? (
                    <StatusSelect
                      id={t.id}
                      value={t.status}
                      options={opts(TASK_STATUS)}
                      action={setTaskStatus}
                    />
                  ) : (
                    <Status value={t.status} />
                  )}
                </Td>
                <Td>
                  {canWrite && mine && (
                    <FormModal
                      title="Edit task"
                      trigger="Edit"
                      variant="ghost"
                      size="xs"
                      action={saveTask}
                      fields={taskFields(projects, members)}
                      values={{
                        ...t,
                        assigneeId: t.assignee_id ?? "",
                        projectId: t.project_id,
                        dueDate: t.due_date ?? "",
                        description: t.description ?? "",
                      }}
                      extra={{ id: t.id }}
                    />
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
