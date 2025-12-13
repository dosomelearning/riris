# template-spa



## Development Environment
* Dev OS: Fedora Linux 40
* uname -a: Linux 6.12.4-100.fc40.x86_64 #1 SMP PREEMPT_DYNAMIC Mon Dec  9 22:56:40 UTC 2024 x86_64 GNU/Linux
* SELinux is ON/ENFORCING
* IDE: Webstorm 2025.1.1git add 
* Vite: 6.3.5
* React: 19.1.0
* TS: 5.8.3
* vitest: 3.1.3
* AWS CLI, aws-cli/2.15.13 Python/3.11.6 Linux/6.12.4-100.fc40.x86_64 exe/x86_64.fedora.40 prompt/off

For more info about package versions, look into package.json file.

### Testing suite
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
npm install --save-dev @types/jsdom
```

For more info about setting up test environment look at the commit for testing setup.

To run test (interactive, continuous mode):
```bash
 npm run test
 ```
### AWS SDK
We need some packages to make ti work with AWS:
```bash
npm install oidc-client-ts react-oidc-context --save
```

