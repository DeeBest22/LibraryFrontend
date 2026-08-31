/**
 * Admin: member registry with Active / Pending Approval / Inactive tabs,
 * direct member registration and the approval queue.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Search, UserPlus, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmptyState,
  ErrorState,
  Guard,
  LoadingRows,
  Page,
  StatusBadge,
} from '@/components/shell';
import {
  api,
  apiError,
  DEPARTMENTS,
  formatDate,
  LEVELS,
  Member,
  MemberInput,
  memberSchema,
} from '@/lib/api';

function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      matricNumber: '',
      department: '',
      level: '',
      role: 'USER',
    },
  });

  const create = useMutation({
    mutationFn: api.createMember,
    onSuccess: (result) => {
      toast.success('Member registered and activated', {
        description: `${result.member.fullName} can sign in with ${result.member.email}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast.error('Could not register this member', { description: apiError(error) });
    },
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Register a member</DialogTitle>
          <DialogDescription>
            Accounts created here are active immediately — no approval step. The member signs in with
            this e-mail through the university sign-in service, which owns their password.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit((v) => create.mutate(v))} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-firstName">First name</Label>
              <Input id="m-firstName" {...form.register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-lastName">Last name</Label>
              <Input id="m-lastName" {...form.register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-email">E-mail (sign-in identity)</Label>
            <Input id="m-email" type="email" placeholder="name@unijos.edu.ng" {...form.register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-matric">Matriculation number</Label>
              <Input id="m-matric" placeholder="UJ/2021/CSC/1042" {...form.register('matricNumber')} />
              {errors.matricNumber ? (
                <p className="text-sm text-destructive">{errors.matricNumber.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Leave empty for library staff.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-role">Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) =>
                  form.setValue('role', value as 'USER' | 'ADMIN', { shouldValidate: true })
                }
              >
                <SelectTrigger id="m-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Standard member</SelectItem>
                  <SelectItem value="ADMIN">Librarian (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-department">Department</Label>
              <Select
                value={form.watch('department')}
                onValueChange={(value) =>
                  form.setValue('department', value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="m-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-destructive">{errors.department.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-level">Level</Label>
              <Select
                value={form.watch('level') || ''}
                onValueChange={(value) => form.setValue('level', value, { shouldValidate: true })}
              >
                <SelectTrigger id="m-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Registering…
                </>
              ) : (
                'Register member'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminMembersBody() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-members', tab, submitted],
    queryFn: () => api.members({ status: tab, search: submitted }),
  });

  const setStatus = useMutation({
    mutationFn: ({ member, status }: { member: Member; status: string }) =>
      api.updateMember(member.id, { status }),
    onSuccess: (result, variables) => {
      const map: Record<string, string> = {
        ACTIVE: 'approved and activated',
        INACTIVE: 'deactivated',
        PENDING_APPROVAL: 'moved back to the approval queue',
      };
      toast.success(`${result.member.fullName} ${map[variables.status] ?? 'updated'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
    },
    onError: (err) => {
      toast.error('Could not update this member', { description: apiError(err) });
    },
  });

  const reject = useMutation({
    mutationFn: (member: Member) => api.deleteMember(member.id),
    onSuccess: (_result, member) => {
      toast.success(`Registration for ${member.fullName} rejected and removed`);
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
    },
    onError: (err) => {
      toast.error('Could not reject this registration', { description: apiError(err) });
    },
  });

  const members = data?.items ?? [];
  const counts = data?.counts ?? {};

  const emptyCopy: Record<string, { title: string; description: string }> = {
    ACTIVE: {
      title: 'No active members',
      description:
        'Register a member directly, or approve a pending registration to give someone borrowing rights.',
    },
    PENDING_APPROVAL: {
      title: 'The approval queue is clear',
      description:
        'Self-registrations from students and staff land here for review. Nothing is waiting right now.',
    },
    INACTIVE: {
      title: 'No deactivated members',
      description:
        'Members you deactivate keep their borrowing history and appear here until you reactivate them.',
    },
  };

  return (
    <Page
      title="Members"
      description="Register readers directly, work through the approval queue, and keep academic details and account status current."
      wide
      actions={
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add member
        </Button>
      }
    >
      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search by name, e-mail, matriculation number or department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search members"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Active ({counts.ACTIVE ?? 0})</TabsTrigger>
          <TabsTrigger value="PENDING_APPROVAL">
            Pending approval ({counts.PENDING_APPROVAL ?? 0})
          </TabsTrigger>
          <TabsTrigger value="INACTIVE">Inactive ({counts.INACTIVE ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : isError ? (
            <ErrorState message={apiError(error)} onRetry={() => refetch()} />
          ) : members.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="h-6 w-6" aria-hidden="true" />}
              title={submitted ? 'No members match this search' : emptyCopy[tab].title}
              description={
                submitted
                  ? 'Try a partial name, a matriculation number or a department instead.'
                  : emptyCopy[tab].description
              }
              action={
                tab === 'ACTIVE' && !submitted ? (
                  <Button onClick={() => setAddOpen(true)}>Register a member</Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Matric number</TableHead>
                    <TableHead>Department / level</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell className="tnum text-sm">{member.matricNumber ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.department ?? '—'}
                        {member.level ? ` · ${member.level}` : ''}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.status} />
                        <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                          {member.role}
                        </span>
                      </TableCell>
                      <TableCell className="tnum text-sm text-muted-foreground">
                        {formatDate(member.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {member.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1"
                                disabled={setStatus.isPending}
                                onClick={() => setStatus.mutate({ member, status: 'ACTIVE' })}
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                disabled={reject.isPending}
                                onClick={() => reject.mutate(member)}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                                Reject
                              </Button>
                            </>
                          )}
                          {member.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={setStatus.isPending}
                              onClick={() => setStatus.mutate({ member, status: 'INACTIVE' })}
                            >
                              <UserX className="h-4 w-4" aria-hidden="true" />
                              Deactivate
                            </Button>
                          )}
                          {member.status === 'INACTIVE' && (
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={setStatus.isPending}
                              onClick={() => setStatus.mutate({ member, status: 'ACTIVE' })}
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {addOpen && <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} />}
    </Page>
  );
}

export default function AdminMembers() {
  return (
    <Guard role="ADMIN">
      <AdminMembersBody />
    </Guard>
  );
}