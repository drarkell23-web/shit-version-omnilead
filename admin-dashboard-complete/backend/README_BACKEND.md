# Backend README (Admin)

- Run `npm install`
- Create `.env` from `.env.example`
- Start dev server: `npm run dev` (requires nodemon)
- Endpoint `POST /api/admin/login` with body { email, password } returns JWT.
- Protected endpoints require header `Authorization: Bearer <token>`
