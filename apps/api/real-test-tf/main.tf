
provider "aws" {
  region                      = "us-east-1"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

resource "aws_security_group" "allow_all" {
  name        = "allow-all-ingress"
  description = "Insecure Security Group with unrestricted ingress"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "insecure_postgres" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.micro"
  username             = "postgres"
  password             = "supersecretpassword123"
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = true
  
  # Flaw: Storage is not encrypted
  storage_encrypted   = false

  # Flaw: Publicly accessible
  publicly_accessible = true
}
