# Assign Security Contacts - AWS Organizations

This solution configures security contacts across all accounts in an AWS Organization using a distribution list, ensuring AWS can reach your security team during incidents.

## Recommended file structure

```
security-contacts/
├── main.tf
├── variables.tf
└── outputs.tf
```

---

## 1. `variables.tf`

```bash
variable "security_contact_name" {
  description = "Name of the security contact (team or distribution list name)"
  type        = string
  default     = "Security Team"
}

variable "security_contact_email" {
  description = "Email distribution list for security notifications"
  type        = string
}

variable "security_contact_phone" {
  description = "Phone number for security contact"
  type        = string
}

variable "security_contact_title" {
  description = "Title of the security contact"
  type        = string
  default     = "Security Operations"
}

variable "operations_contact_email" {
  description = "Email distribution list for operations notifications"
  type        = string
  default     = ""
}

variable "project" {
  default = "security-contacts"
}
```

---

## 2. `main.tf`

```bash
provider "aws" {
  region = "us-east-1"
}

# Security alternate contact
resource "aws_account_alternate_contact" "security" {
  alternate_contact_type = "SECURITY"
  name                   = var.security_contact_name
  title                  = var.security_contact_title
  email_address          = var.security_contact_email
  phone_number           = var.security_contact_phone
}

# Operations alternate contact (optional)
resource "aws_account_alternate_contact" "operations" {
  count = var.operations_contact_email != "" ? 1 : 0

  alternate_contact_type = "OPERATIONS"
  name                   = "Operations Team"
  title                  = "Cloud Operations"
  email_address          = var.operations_contact_email
  phone_number           = var.security_contact_phone
}
```

### For multi-account (AWS Organizations)

To apply contacts across all member accounts, use a StackSet or iterate with the `account_id` argument:

```bash
# Apply to a specific member account
resource "aws_account_alternate_contact" "security_member" {
  for_each = toset(var.member_account_ids)

  alternate_contact_type = "SECURITY"
  account_id             = each.value
  name                   = var.security_contact_name
  title                  = var.security_contact_title
  email_address          = var.security_contact_email
  phone_number           = var.security_contact_phone
}

variable "member_account_ids" {
  description = "List of member account IDs to configure"
  type        = list(string)
  default     = []
}
```

---

## 3. `outputs.tf`

```bash
output "security_contact_email" {
  description = "Configured security contact email"
  value       = aws_account_alternate_contact.security.email_address
}

output "security_contact_type" {
  description = "Contact type configured"
  value       = aws_account_alternate_contact.security.alternate_contact_type
}
```

---

## How to deploy

```bash
terraform init
terraform apply \
  -var="security_contact_email=security-team@yourcompany.com" \
  -var="security_contact_phone=+1-555-0100"
```

## Important notes

- Use a **distribution list** (2-3 people minimum), never an individual email address.
- The security contact email can be used to **reset the root password** — host it on a secure mail server.
- Verify contacts with **Security Hub control Account.1**.
- For organizations with many accounts, manage contacts centrally via **AWS Organizations API** or CloudFormation StackSets.
- Keep contacts updated when team members change roles — stale contacts mean missed incident notifications.
