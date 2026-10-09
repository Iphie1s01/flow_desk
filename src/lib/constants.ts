export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export const ROLES: Role[] = ['owner', 'admin', 'member', 'viewer'];
export const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
export const PROJECT_STATUS = [['planning', 'Planning'], ['in_progress', 'In progress'], ['on_hold', 'On hold'], ['completed', 'Completed']] as const;
export const TASK_STATUS = [['todo', 'To do'], ['in_progress', 'In progress'], ['in_review', 'In review'], ['done', 'Completed']] as const;
export const PRIORITY = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['urgent', 'Urgent']] as const;
export const CUSTOMER_STATUS = [['lead', 'Lead'], ['active', 'Active'], ['inactive', 'Inactive']] as const;
export const METHODS = [['bank_transfer', 'Bank transfer'], ['card', 'Card'], ['cash', 'Cash'], ['pos', 'POS'], ['other', 'Other']] as const;
export const INVOICE_STATUS = [['draft', 'Draft'], ['sent', 'Sent'], ['partially_paid', 'Partially paid'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['void', 'Void']] as const;
export const LABEL: Record<string, string> = Object.fromEntries([...PROJECT_STATUS, ...TASK_STATUS, ...PRIORITY, ...CUSTOMER_STATUS, ...METHODS, ...INVOICE_STATUS, ['owner', 'Owner'], ['admin', 'Admin'], ['member', 'Member'], ['viewer', 'Viewer'], ['pending', 'Invited']]);
export const opts = (a: readonly (readonly [string, string])[]) => a.map(([value, label]) => ({ value, label }));
export const BUSINESS_TYPES = ['Freelancer', 'Creative agency', 'Small business', 'Consultancy', 'Studio', 'Other'];
export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
export const GOALS = [['clients', 'Manage clients'], ['projects', 'Track projects'], ['invoices', 'Send invoices'], ['team', 'Manage a team']] as const;
export const FILE_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'text/plain': 'txt', 'text/csv': 'csv', 'application/zip': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx' };
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
