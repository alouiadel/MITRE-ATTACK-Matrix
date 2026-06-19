# MITRE ATT&CK Matrix — Financial Sector

> Forked from [ichrakamani/MITRE-ATTACK](https://github.com/ichrakamani/MITRE-ATTACK)

A curated MITRE ATT&CK Navigator layer highlighting the top techniques most relevant to the financial sector.

![Demo](mitre.gif)

## Layer Summary

| Property          | Value                        |
| ----------------- | ---------------------------- |
| Layer name        | `top13(all of them)`         |
| ATT&CK version    | 12                           |
| Navigator version | 4.8.0                        |
| Domain            | enterprise-attack            |
| Total techniques  | 214 (182 unique)             |
| Score range       | 10 – 110                     |
| Sorting           | Score descending             |
| Gradient          | Green → Yellow → Red (0–100) |

## Techniques by Tactic

| Tactic               | Count |
| -------------------- | ----- |
| defense-evasion      | 47    |
| discovery            | 23    |
| persistence          | 18    |
| command-and-control  | 17    |
| privilege-escalation | 16    |
| collection           | 15    |
| credential-access    | 14    |
| execution            | 14    |
| resource-development | 13    |
| initial-access       | 11    |
| impact               | 10    |
| lateral-movement     | 9     |
| reconnaissance       | 4     |
| exfiltration         | 3     |

## Top Scoring Techniques

| ID                                         | Score |
| ------------------------------------------ | ----- |
| T1059.001 (PowerShell)                     | 110   |
| T1027 (Obfuscated Files or Info)           | 110   |
| T1588.002 (Obtain Capabilities: Tool)      | 110   |
| T1204.002 (User Execution: Malicious File) | 100   |
| T1105 (Ingress Tool Transfer)              | 100   |
| T1059.003 (Windows Command Shell)          | 90    |
| T1566.001 (Spearphishing Attachment)       | 90    |

## Run Locally

```sh
python3 run-site.py
```

Opens the matrix in your browser (defaults to port 8000; pass a custom port as an argument).

## Platforms Covered

Linux, macOS, Windows, Network, PRE, Containers, Office 365, SaaS, Google Workspace, IaaS, Azure AD
