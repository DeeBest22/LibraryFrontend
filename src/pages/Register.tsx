/**
 * Public self-registration. Accounts are created with status
 * PENDING_APPROVAL and cannot borrow until a librarian approves them.
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Footer, Header, useSession } from '@/components/shell';
import {
  api,
  apiError,
  client,
  clearRegistrationDraft,
  DEPARTMENTS,
  LEVELS,
  readRegistrationDraft,
  registrationSchema,
  RegistrationInput,
  saveRegistrationDraft,
} from '@/lib/api';

export default function Register() {
  const { data: session, isLoading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authed = Boolean(session?.authenticated);

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
    defaultValues:
      readRegistrationDraft() ?? {
        firstName: '',
        lastName: '',
        matricNumber: '',
        department: '',
        level: '',
      },
  });

  const register = useMutation({
    mutationFn: api.selfRegister,
    onSuccess: (result) => {
      clearRegistrationDraft();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.success('Registration submitted', {
        description: result.message || 'A librarian will review your membership shortly.',
      });
    },
    onError: (error) => {
      toast.error('Registration failed', { description: apiError(error) });
    },
  });

  /* A signed-in visitor who already has a profile does not need this form. */
  useEffect(() => {
    if (session?.member) {
      const draft = readRegistrationDraft();
      if (draft) clearRegistrationDraft();
    }
  }, [session?.member]);

  const onSubmit = (values: RegistrationInput) => {
    if (!authed) {
      // Keep the typed details, authenticate, then come back and submit.
      saveRegistrationDraft(values);
      toast.info('One more step', {
        description: 'Sign in with your university account to submit the registration.',
      });
      client.auth.toLogin();
      return;
    }
    register.mutate(values);
  };

  const member = session?.member;

  if (member) {
    const pending = member.status === 'PENDING_APPROVAL';
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-16 sm:px-6">
          <Card className="w-full">
            <CardHeader>
              <span className="mb-2 grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                {pending ? (
                  <Clock className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <CardTitle className="font-display text-2xl">
                {pending ? 'Awaiting librarian approval' : 'You are already a member'}
              </CardTitle>
              <CardDescription>
                {pending
                  ? `Thanks ${member.firstName}. Your registration is in the approval queue — you will be able to borrow as soon as a librarian approves it.`
                  : `Signed in as ${member.fullName}${member.matricNumber ? ` · ${member.matricNumber}` : ''}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {!pending && (
                <Button
                  onClick={() => navigate(member.role === 'ADMIN' ? '/admin/reports' : '/dashboard')}
                >
                  Go to my area
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/about">About the library</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <Card>
          <CardHeader>
            <span className="mb-2 grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <CardTitle className="font-display text-2xl">Register for library access</CardTitle>
            <CardDescription>
              Give us your academic details. New memberships start as pending and a librarian approves
              them before you can borrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricNumber">Matriculation number</Label>
                <Input id="matricNumber" placeholder="UJ/2021/CSC/1042" {...form.register('matricNumber')} />
                {errors.matricNumber ? (
                  <p className="text-sm text-destructive">{errors.matricNumber.message}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Format: UJ / year of entry / department code / serial number.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={form.watch('department')}
                    onValueChange={(value) =>
                      form.setValue('department', value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select your department" />
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
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={form.watch('level')}
                    onValueChange={(value) => form.setValue('level', value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="level">
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.level && <p className="text-sm text-destructive">{errors.level.message}</p>}
                </div>
              </div>

              <div className="rounded-md border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                Your e-mail and password are handled by the university sign-in service — this form never
                stores a password. {authed ? '' : 'You will be asked to sign in when you submit.'}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg" disabled={register.isPending || isLoading}>
                  {register.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Submitting registration…
                    </>
                  ) : (
                    'Submit registration'
                  )}
                </Button>
                <Button type="button" variant="ghost" asChild>
                  <Link to="/login">I already have an account</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}