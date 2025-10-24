# RIRiS

© 2025 Vladimir Sabo. All rights reserved.

This repository is public for viewing and cloning only.
No rights are granted to use, modify, copy, distribute, or create derivative works
from this code in any form, for any purpose, without explicit written permission
from the copyright holder.

Having collaborator or admin access does **not** grant any license or usage rights.

---

### Project map

This repo hosts multiple stacks. Jump straight to what you need:

- **`/front/`** – React SPA (frontend) → dedicated CI.
- **`/back/`** – AWS SAM (Python backend) → dedicated CI.
- **`/auth/`** – AWS Cognito setup.
- **`/infra/`** – Core infra (CloudFormation + bash): SPA hosting S3, data S3, CloudFront, etc.

See **/front**, **/back**, **/auth**, and **/infra** for stack-specific docs and code.


---

### Purpose


The goal of this project is to develop a **scalable and secure system for sharing large files**.  
It will allow authenticated users to upload, manage, and distribute files efficiently, leveraging AWS-native services for storage, access control, and delivery performance.  

The architecture emphasizes:
- Clean separation of layers and responsibilities.
- Robust backend services for secure file handling.
- A modern frontend interface for intuitive user interaction.
- Automated deployment and testing flows for both frontend and backend stacks.

Future work will expand each component toward a production-ready platform capable of handling high-volume, controlled data sharing scenarios.

.