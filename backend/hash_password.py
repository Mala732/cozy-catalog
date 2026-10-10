
from getpass import getpass
from pwdlib import PasswordHash

password = getpass("Choose a strong admin password: ")
confirmation = getpass("Confirm admin password: ")

if len(password) < 14:
    raise SystemExit("Use at least 14 characters.")

if password != confirmation:
    raise SystemExit("Passwords do not match.")

print("\nCopy this hash into ADMIN_PASSWORD_HASH in .env:\n")
print(PasswordHash.recommended().hash(password))
