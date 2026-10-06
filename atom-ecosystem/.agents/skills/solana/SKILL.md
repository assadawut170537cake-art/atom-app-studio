---
name: solana
description: Solana blockchain queries, wallet inspection, token transfers, and NFT interactions using Solana CLI or RPC endpoints. Use when asked about Solana network, SOL balances, tokens, or smart contracts.
---

# Solana Skill

This skill provides instructions for querying Solana blockchain accounts, inspecting SOL balances, and interacting with Solana RPC endpoints.

## Prerequisites
- Solana CLI (`solana`) or Python `solana-py` / `anchor-py`
- RPC endpoint (e.g. `https://api.mainnet-beta.solana.com` or Devnet)

## Common Commands

### Check Account Balance
```bash
solana balance <WALLET_ADDRESS> --url devnet
```

### Inspect Account Info
```bash
solana account <WALLET_ADDRESS> --url devnet
```

### Transfer SOL
```bash
solana transfer <RECIPIENT_ADDRESS> <AMOUNT> --from <KEYPAIR_FILE> --url devnet
```
