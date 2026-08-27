"use client";

// Rule F8a — form component structure. Provider side of contracts/auth-api.md's
// POST /v1/auth/signup, via trpc.auth.signup; establishing the actual session is a
// separate step (next-auth's signIn()) right after signup succeeds — signup itself
// never returns or handles the backend token client-side.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isTRPCClientError } from "@trpc/client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { signupInputSchema, type SignupInput } from "@/lib/auth/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const router = useRouter();
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupInputSchema),
    defaultValues: { email: "", password: "", displayName: "" },
  });

  const signupMutation = trpc.auth.signup.useMutation();

  const onSubmit = async (values: SignupInput) => {
    try {
      await signupMutation.mutateAsync(values);
    } catch (error) {
      const message = isTRPCClientError(error) ? error.message : "Something went wrong.";
      toast.error(message);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (signInResult?.error) {
      toast.success("Account created — sign in to continue.");
      router.push("/login");
      return;
    }

    toast.success("Welcome to FlowBoard!");
    router.push("/");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Name <span className="pl-1 font-bold text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Your name" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Email <span className="pl-1 font-bold text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Password <span className="pl-1 font-bold text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="At least 10 characters"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={form.formState.isSubmitting} type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </Form>
  );
}
