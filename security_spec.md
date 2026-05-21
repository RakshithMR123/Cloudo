# Hardened Red Team Security Specification

## 1. Data Invariants
- **Message Integrity**: A message cannot exist without a valid parenting channel path ID.
- **Identity Integrity**: Users can only edit or delete messages they authored.
- **Schema Safety**: Unbounded lists (chats) reside in subcollections rather than document arrays.
- **Value Constraints**: Text inputs are capped strictly to prevent resource bloating attacks.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Ghost Fields Injection**: Adding `isAdmin: true` during channel update.
2. **Channel ID Hijacking**: Path variable mismatch in channel metadata.
3. **Spoofed Sender Role**: Author claiming system privilege `role: "system"`.
4. **Huge Payload Overflow**: Sending 10MB string contents in blogs.
5. **Timestamp Temporal Cheat**: Setting future timestamps on chat messages.
6. **Like-Spam Multiplication**: Incrementing likes count by 20 inside single update request.
7. **Orphaned Message Spawn**: Posting message referencing non-existing channel.
8. **Anonymity Policy Bypass**: Reading private chats without email-verified assertion.
9. **Deletion of Global Directories**: Issuing delete requests on general channel directory.
10. **Tag Memory Leak**: Posting list tags exceeding maximum allowed parameters.
11. **Client Claim Promotion**: Setting credentials on Google profile updates.
12. **PII Blanket Harvest**: Bulk querying developer private communications.

## 3. Security Assertions & Rules Status
All test cases demonstrate correct transition handling, protecting the databases backend securely.
