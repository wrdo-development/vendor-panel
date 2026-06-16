import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes } from "@medusajs/types"
import { UseMutationOptions, useMutation } from "@tanstack/react-query"
import { fetchQuery, sdk } from "../../lib/client"
import {
  VENDOR_AUTH_ACTOR,
  setActiveSellerId,
  clearActiveSellerId,
} from "../../lib/mercur-compat"

export const useSignInWithEmailPass = (
  options?: UseMutationOptions<
    | string
    | {
        location: string
      },
    FetchError,
    HttpTypes.AdminSignUpWithEmailPassword
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.auth.login(VENDOR_AUTH_ACTOR, "emailpass", payload),
    onSuccess: async (data, variables, context) => {
      // WRDO: this backend authorises /vendor/* for the "member" actor and
      // requires an active seller (x-seller-id header or session seller_id),
      // set via /vendor/sellers/select. Establish it here so the first
      // authenticated boot call doesn't 401 and bounce to "Session expired".
      // Revert this block + the "member" provider names once the backend's
      // "seller" auth provider is wired (see fix/vendor-panel-member-auth).
      try {
        const { seller_members } = await fetchQuery("/vendor/sellers", {
          method: "GET",
        })
        const sellerId = seller_members?.[0]?.seller_id
        if (sellerId) {
          // Persist BEFORE select so fetchQuery attaches x-seller-id from here on.
          setActiveSellerId(sellerId)
          await fetchQuery("/vendor/sellers/select", {
            method: "POST",
            body: { seller_id: sellerId },
          })
        }
      } catch {
        // non-fatal: if select fails, downstream calls surface the real error
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useSignUpWithEmailPass = (
  options?: UseMutationOptions<
    string,
    FetchError,
    HttpTypes.AdminSignInWithEmailPassword & {
      confirmPassword: string
      name: string
    }
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.auth.register(VENDOR_AUTH_ACTOR, "emailpass", payload),
    onSuccess: async (_, variables) => {
      const seller = {
        name: variables.name,
        member: {
          name: variables.name,
          email: variables.email,
        },
      }
      await fetchQuery("/vendor/sellers", {
        method: "POST",
        body: seller,
      })
    },
    ...options,
  })
}

export const useSignUpForInvite = (
  options?: UseMutationOptions<
    string,
    FetchError,
    HttpTypes.AdminSignInWithEmailPassword
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.auth.register(VENDOR_AUTH_ACTOR, "emailpass", payload),
    ...options,
  })
}

export const useResetPasswordForEmailPass = (
  options?: UseMutationOptions<void, FetchError, { email: string }>
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.auth.resetPassword(VENDOR_AUTH_ACTOR, "emailpass", {
        identifier: payload.email,
      }),
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useLogout = (options?: UseMutationOptions<void, FetchError>) => {
  return useMutation({
    mutationFn: () => sdk.auth.logout(),
    onSuccess: async (data, variables, context) => {
      // WRDO: drop the active seller so it can't leak into the next session
      clearActiveSellerId()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateProviderForEmailPass = (
  token: string,
  options?: UseMutationOptions<void, FetchError, { password: string }>
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.auth.updateProvider(VENDOR_AUTH_ACTOR, "emailpass", payload, token),
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
