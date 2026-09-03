/**
 * Public self-registration. Accounts are created with status
 * PENDING_APPROVAL and cannot borrow until a librarian approves them.
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, Loader2, UserPlus } from 'lucide-react';
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
      <div className="flex min-h-screen flex-col bg-secondary/30">
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center gap-4 px-4 py-16 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <Card className="w-full rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="items-center text-center">
              <div
                className={
                  'mb-1 grid size-16 place-items-center rounded-2xl ' +
                  (pending ? 'bg-amber-500/10' : 'bg-emerald-500/10')
                }
              >
                {pending ? (
                  <Clock className="size-8 text-amber-600" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
                )}
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">
                {pending ? 'Awaiting librarian approval' : 'You are already a member'}
              </CardTitle>
              <CardDescription className="leading-relaxed">
                {pending
                  ? `Thanks ${member.firstName}. Your registration is in the approval queue — you will be able to borrow as soon as a librarian approves it.`
                  : `Signed in as ${member.fullName}${member.matricNumber ? ` · ${member.matricNumber}` : ''}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap justify-center gap-3">
              {!pending && (
                <Button
                  className="h-12 rounded-full px-6 font-medium hover:brightness-110"
                  onClick={() => navigate(member.role === 'ADMIN' ? '/admin/reports' : '/dashboard')}
                >
                  Go to my area
                </Button>
              )}
              <Button
                variant="outline"
                className="h-12 rounded-full px-6 font-medium"
                asChild
              >
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
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-start gap-4 px-4 py-12 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <Card className="w-full rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-1 grid size-16 place-items-center rounded-2xl bg-primary/10">
              <UserPlus className="size-8 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-2xl tracking-tight">
              Register for library access
            </CardTitle>
            <CardDescription className="leading-relaxed">
              Give us your academic details. New memberships start as pending and a librarian approves
              them before you can borrow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    className="h-11 rounded-xl"
                    autoComplete="given-name"
                    {...form.register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    className="h-11 rounded-xl"
                    autoComplete="family-name"
                    {...form.register('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricNumber">Matriculation number</Label>
                <Input
                  id="matricNumber"
                  className="h-11 rounded-xl"
                  placeholder="UJ/2021/CSC/1042"
                  {...form.register('matricNumber')}
                />
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
                    <SelectTrigger id="department" className="h-11 rounded-xl">
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
                    <SelectTrigger id="level" className="h-11 rounded-xl">
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

              <div className="rounded-xl bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                Your e-mail and password are handled by the university sign-in service — this form never
                stores a password. {authed ? '' : 'You will be asked to sign in when you submit.'}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="submit"
                  className="h-12 flex-1 rounded-full font-medium hover:brightness-110 sm:flex-none sm:px-8"
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
                <Button type="button" variant="ghost" className="h-12 rounded-full font-medium" asChild>
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