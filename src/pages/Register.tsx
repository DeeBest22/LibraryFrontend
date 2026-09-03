/**
 * Public self-registration. Accounts are created with status
 * PENDING_APPROVAL and cannot borrow until a librarian approves them.
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Footer, useSession } from '@/components/shell';
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

const STEPS = ['Submitted', 'Librarian review', 'Approved to borrow'];
const fieldClass = 'h-11';

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

  const BackButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Back"
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-muted sm:inline-flex"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  /* ---------------------------------------------------------------- */
  /* Already have a profile: show the card itself, stamped with status */
  /* ---------------------------------------------------------------- */
  if (member) {
    const pending = member.status === 'PENDING_APPROVAL';
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <main className="mx-auto flex w-full max-w-xl flex-1 items-start gap-3 px-4 py-6 sm:items-center sm:gap-4 sm:px-6 sm:py-16">
          {BackButton}
          <div className="w-full rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-xl sm:border sm:bg-card sm:p-9 sm:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Borrower card
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {pending ? `Welcome, ${member.firstName}` : member.fullName}
                </h1>
                {member.matricNumber && (
                  <p className="mt-1 text-sm text-muted-foreground">{member.matricNumber}</p>
                )}
              </div>
              <span
                className={
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium ' +
                  (pending
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800')
                }
              >
                {pending ? 'Pending' : 'Active'}
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {pending
                ? "Your application is in the librarian's queue. You'll be able to borrow as soon as it's approved."
                : 'You already hold an active membership.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {!pending && (
                <Button
                  className="h-11 flex-1 sm:flex-none sm:px-6"
                  onClick={() => navigate(member.role === 'ADMIN' ? '/admin/reports' : '/dashboard')}
                >
                  Go to my area
                </Button>
              )}
              <Button variant="ghost" className="h-11" asChild>
                <Link to="/about">About the library</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* The application itself: a simple, responsive registration form    */
  /* ---------------------------------------------------------------- */
  const errors = form.formState.errors;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-start gap-3 px-4 py-6 sm:gap-4 sm:px-6 sm:py-14">
        {BackButton}
        <div className="w-full rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-xl sm:border sm:bg-card sm:p-8 sm:shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Register for library access
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Give us your academic details. New memberships start pending and a librarian
            approves them before you can borrow.
          </p>

          <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={
                    'grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium ' +
                    (index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted')
                  }
                >
                  {index + 1}
                </span>
                <span className={index === 0 ? 'font-medium text-foreground' : ''}>{step}</span>
                {index < STEPS.length - 1 && <span className="mx-1 hidden sm:inline">→</span>}
              </li>
            ))}
          </ol>

          <form className="mt-7 space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  className={fieldClass}
                  autoComplete="given-name"
                  {...form.register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  className={fieldClass}
                  autoComplete="family-name"
                  {...form.register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="matricNumber">Matriculation number</Label>
              <Input
                id="matricNumber"
                className={fieldClass}
                placeholder="UJ/2021/CSC/1042"
                {...form.register('matricNumber')}
              />
              {errors.matricNumber ? (
                <p className="text-sm text-destructive">{errors.matricNumber.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Format: UJ / year of entry / department code / serial number.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={form.watch('department')}
                  onValueChange={(value) =>
                    form.setValue('department', value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="department" className={fieldClass}>
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
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={form.watch('level')}
                  onValueChange={(value) => form.setValue('level', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="level" className={fieldClass}>
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
                {errors.level && (
                  <p className="text-sm text-destructive">{errors.level.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-md bg-muted px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Your e-mail and password are handled by the university sign-in service — this
              form never stores a password.
              {!authed && ' You will be asked to sign in when you submit.'}
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-5">
              <Button
                type="submit"
                className="h-12 w-full sm:w-auto sm:px-9"
                disabled={register.isPending || isLoading}
              >
                {register.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting registration…
                  </>
                ) : (
                  'Submit registration'
                )}
              </Button>
              <Link
                to="/login"
                className="text-center text-sm font-medium underline-offset-4 hover:underline sm:text-left"
              >
                I already have an account
              </Link>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}