import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type WalletBalance = {
  available: number;
  pending: number;
  withdrawn: number;
  total_earned: number;
};

export type WalletTx = Database["public"]["Tables"]["wallet_transactions"]["Row"];
export type Withdrawal = Database["public"]["Tables"]["wallet_withdrawals"]["Row"];

export function useWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<WalletBalance>({
    available: 0,
    pending: 0,
    withdrawn: 0,
    total_earned: 0,
  });
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: bal }, { data: txs }, { data: wds }] = await Promise.all([
      supabase.rpc("wallet_balance", { _user_id: user.id }),
      supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("wallet_withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(50),
    ]);
    if (bal && bal[0]) {
      setBalance({
        available: Number(bal[0].available ?? 0),
        pending: Number(bal[0].pending ?? 0),
        withdrawn: Number(bal[0].withdrawn ?? 0),
        total_earned: Number(bal[0].total_earned ?? 0),
      });
    }
    setTransactions(txs ?? []);
    setWithdrawals(wds ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: atualiza quando transações ou saques mudam
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallet_withdrawals", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { balance, transactions, withdrawals, loading, refresh };
}
