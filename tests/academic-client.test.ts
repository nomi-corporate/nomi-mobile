import assert from 'node:assert/strict';
import test from 'node:test';
import { AcademicApiError, AcademicClient } from '../src/features/academic/infrastructure/AcademicClient.ts';
import { normalizeAcademicApiUrl } from '../src/features/academic/urlPolicy.ts';
import { shiftDate, weekDates } from '../src/features/agenda/agendaDate.ts';

const subject = { id: 'subject-1', version: 1, name: 'Cálculo I', code: 'MAT101', colorToken: 'lavender', iconKey: 'book', professorIds: [], archived: false, createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:00Z' };
const professor = { id: 'professor-1', name: 'Ana Silva', email: 'ana@example.test', office: 'Sala 204', archived: false, version: 1, createdAt: '2026-11-19T00:00:00Z', updatedAt: '2026-11-19T00:00:00Z' };
const profile = { id: 'user-1', displayName: 'Ana', email: 'ana@example.test', theme: 'system', locale: 'pt-BR', timeZone: 'America/Sao_Paulo', version: 1, avatarUrl: null };

test('civil day navigation does not skip a day around daylight saving time', () => {
  assert.equal(shiftDate('2026-03-08', 1), '2026-03-09');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(weekDates('2026-11-20'), ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
});

test('agenda queries keep the selected civil date and encoded time zone', async () => {
  const request: typeof fetch = async (url) => {
    assert.equal(url, 'https://academic.example.test/api/v1/agenda?fromDate=2026-11-20&toDate=2026-11-21&timeZone=America%2FSao_Paulo');
    return Response.json({ items: [], nextCursor: null, fromDate: '2026-11-20', toDate: '2026-11-21', timeZone: 'America/Sao_Paulo', generatedAt: '2026-11-20T15:00:00Z', classOccurrencesAvailable: false });
  };
  const page = await new AcademicClient('https://academic.example.test', async () => 'access-token', request).getAgenda('2026-11-20', '2026-11-21', 'America/Sao_Paulo');
  assert.equal(page.classOccurrencesAvailable, false);
});

test('commitment detail uses the same display time zone as the agenda', async () => {
  const request: typeof fetch = async (url) => {
    assert.equal(url, 'https://academic.example.test/api/v1/commitments/item-1?timeZone=America%2FSao_Paulo');
    return Response.json({ id: 'item-1', displayDate: '2026-11-20', displayTime: '14:00' });
  };
  const detail = await new AcademicClient('https://academic.example.test', async () => 'access-token', request).getCommitment('item-1', 'America/Sao_Paulo');
  assert.equal(detail.displayTime, '14:00');
});

test('group creation sends one idempotent intent to the Academic API', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/groups');
    assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), 'same-intent');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Turma A', description: null });
    return Response.json({ id: 'group-1', name: 'Turma A', description: null, role: 'owner', version: 0, createdAt: '2026-11-20T15:00:00Z', updatedAt: '2026-11-20T15:00:00Z' }, { status: 201 });
  };
  const created = await new AcademicClient('https://academic.example.test', async () => 'access-token', request).createGroup(' Turma A ', '', 'same-intent');
  assert.equal(created.role, 'owner');
});

test('profile edits persist using the version returned by the API', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/me');
    if (options?.method === 'PATCH') {
      assert.equal(new Headers(options.headers).get('If-Match'), '"1"');
      assert.deepEqual(JSON.parse(String(options.body)), { displayName: 'Ana Souza', theme: 'dark' });
      return Response.json({ ...profile, displayName: 'Ana Souza', theme: 'dark', version: 2 });
    }
    return Response.json(profile);
  };
  const client = new AcademicClient('https://academic.example.test', async () => 'access-token', request);
  const loaded = await client.getProfile();
  const saved = await client.updateProfile(loaded.version, { displayName: 'Ana Souza', theme: 'dark' });
  assert.equal(saved.displayName, 'Ana Souza');
  assert.equal(saved.version, 2);
});

test('invalid profile preferences cannot be applied as a saved profile', async () => {
  const client = new AcademicClient('https://academic.example.test', async () => 'access-token', async () => Response.json({ ...profile, theme: 'invalid' }));
  await assert.rejects(client.getProfile(), (error: unknown) => error instanceof AcademicApiError && error.status === 502);
});

test('Academic client lists active subjects with bearer token', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/subjects?archived=false&query=Calculo&limit=20');
    assert.equal(options?.headers && new Headers(options.headers).get('Authorization'), 'Bearer access-token');
    return Response.json({ items: [subject], nextCursor: null });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .listSubjects({ query: 'Calculo', limit: 20 });
  assert.deepEqual(result.items[0], subject);
});

test('Academic client sends idempotency key on subject creation', async () => {
  const request: typeof fetch = async (_url, options) => {
    assert.equal(options?.method, 'POST');
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('Idempotency-Key'), 'subject-create-key');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Cálculo I', code: null, colorToken: 'lavender', iconKey: 'book' });
    return Response.json(subject, { status: 201 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request).createSubject({ name: ' Cálculo I ' }, 'subject-create-key');
  assert.equal(result.id, 'subject-1');
});

test('Academic client does not send requests without an access token', async () => {
  let called = false;
  let expired = 0;
  const request: typeof fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(new AcademicClient('https://academic.example.test', async () => null, request, undefined, () => { expired += 1; }).listSubjects(),
    (error: unknown) => error instanceof AcademicApiError && error.status === 401);
  assert.equal(called, false);
  assert.equal(expired, 1);
});

test('Academic unauthorized response invalidates the local session', async () => {
  let expired = 0;
  const request: typeof fetch = async () => Response.json({ message: 'unauthorized' }, { status: 401 });
  await assert.rejects(
    new AcademicClient('https://academic.example.test', async () => 'stale-token', request, undefined, () => { expired += 1; })
      .listSubjects(),
    (error: unknown) => error instanceof AcademicApiError
      && error.status === 401
      && error.message === 'Sua sessão expirou. Entre novamente.',
  );
  assert.equal(expired, 1);
});

test('Academic client explains network failures without exposing the host exception', async () => {
  const request: typeof fetch = async () => { throw new TypeError('Failed to connect to /10.0.2.2:5101'); };
  await assert.rejects(
    new AcademicClient('http://10.0.2.2:5101', async () => 'access-token', request, true).listSubjects(),
    (error: unknown) => error instanceof AcademicApiError
      && error.status === 0
      && error.message === 'Não foi possível acessar o serviço acadêmico. Confira sua conexão e tente novamente.',
  );
});

test('Academic client never exposes server error details to the user', async () => {
  const request: typeof fetch = async () => Response.json({ detail: 'PostgreSQL password is invalid at 10.0.0.4' }, { status: 500 });
  await assert.rejects(
    new AcademicClient('https://academic.example.test', async () => 'access-token', request).listSubjects(),
    (error: unknown) => error instanceof AcademicApiError
      && error.status === 500
      && error.message === 'O serviço acadêmico está temporariamente indisponível.'
      && !error.message.includes('PostgreSQL'),
  );
});

test('malformed successful responses do not expose their private body', async () => {
  const request: typeof fetch = async (_url, options) => {
    assert.equal(options?.redirect, 'error');
    assert.ok(options?.signal);
    return new Response('private server detail', { status: 200 });
  };
  await assert.rejects(new AcademicClient('https://academic.example.test', async () => 'access-token', request).getProfile(),
    (error: unknown) => error instanceof AcademicApiError && error.status === 502 && !error.message.includes('private'));
});

test('Academic API requires HTTPS outside development', () => {
  assert.equal(normalizeAcademicApiUrl('https://academic.example.test/', false), 'https://academic.example.test');
  assert.equal(normalizeAcademicApiUrl('http://10.0.2.2:5101', true), 'http://10.0.2.2:5101');
  assert.throws(() => normalizeAcademicApiUrl('http://academic.example.test', true));
  assert.throws(() => normalizeAcademicApiUrl('http://10.0.2.2:5101', false));
});

test('Academic client updates a subject with the version precondition', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/subjects/subject-1');
    assert.equal(options?.method, 'PATCH');
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('If-Match'), '"1"');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Cálculo II' });
    return Response.json({ ...subject, name: 'Cálculo II', version: 2 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .updateSubject('subject-1', 1, { name: 'Cálculo II' });
  assert.equal(result.version, 2);
  assert.equal(result.name, 'Cálculo II');
});

test('Academic client archives a subject with the version precondition', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/subjects/subject-1/archive');
    assert.equal(options?.method, 'PUT');
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('If-Match'), '"1"');
    assert.deepEqual(JSON.parse(String(options?.body)), { archived: true });
    return Response.json({ ...subject, archived: true, version: 2 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .archiveSubject('subject-1', 1);
  assert.equal(result.archived, true);
});

test('subject details are fetched again before editing', async () => {
  const request: typeof fetch = async (url) => {
    assert.equal(url, 'https://academic.example.test/api/v1/subjects/subject-1');
    return Response.json({ ...subject, version: 4 });
  };
  assert.equal((await new AcademicClient('https://academic.example.test', async () => 'access-token', request).getSubject('subject-1')).version, 4);
});

test('replacing and removing professor links use the subject version', async () => {
  const links: string[][] = [];
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/subjects/subject-1/professors');
    assert.equal(options?.method, 'PUT');
    assert.equal(new Headers(options?.headers).get('If-Match'), '"3"');
    const ids = JSON.parse(String(options?.body)).professorIds;
    links.push(ids);
    return Response.json({ ...subject, version: 4, professorIds: ids });
  };
  const client = new AcademicClient('https://academic.example.test', async () => 'access-token', request);
  await client.replaceSubjectProfessors('subject-1', 3, ['professor-1']);
  await client.replaceSubjectProfessors('subject-1', 3, []);
  assert.deepEqual(links, [['professor-1'], []]);
});

test('link version conflict is reported without silently retrying the write', async () => {
  let calls = 0;
  const request: typeof fetch = async () => { calls += 1; return new Response(null, { status: 412 }); };
  const client = new AcademicClient('https://academic.example.test', async () => 'access-token', request);
  await assert.rejects(client.replaceSubjectProfessors('subject-1', 1, []),
    (error: unknown) => error instanceof AcademicApiError && error.status === 412);
  assert.equal(calls, 1);
});

test('Academic client lists professors with filters and bearer token', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/professors?archived=false&query=Ana&limit=100');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer access-token');
    return Response.json({ items: [professor], nextCursor: null });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .listProfessors({ query: ' Ana ', limit: 100 });
  assert.deepEqual(result.items, [professor]);
});

test('Academic client creates a professor with the stable idempotency key', async () => {
  const request: typeof fetch = async (_url, options) => {
    const headers = new Headers(options?.headers);
    assert.equal(options?.method, 'POST');
    assert.equal(headers.get('Idempotency-Key'), 'same-intent-key');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Ana Silva', email: 'ana@example.test', office: 'Sala 204' });
    return Response.json(professor, { status: 201 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .createProfessor({ name: ' Ana Silva ', email: ' ana@example.test ', office: ' Sala 204 ' }, 'same-intent-key');
  assert.equal(result.id, 'professor-1');
});

test('Academic client updates a professor with the version precondition', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/professors/professor-1');
    assert.equal(options?.method, 'PATCH');
    assert.equal(new Headers(options?.headers).get('If-Match'), '"1"');
    assert.deepEqual(JSON.parse(String(options?.body)), { name: 'Ana Souza', office: null });
    return Response.json({ ...professor, name: 'Ana Souza', office: null, version: 2 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .updateProfessor('professor-1', 1, { name: ' Ana Souza ', office: null });
  assert.equal(result.version, 2);
});

test('Academic client archives a professor with the version precondition', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://academic.example.test/api/v1/professors/professor-1/archive');
    assert.equal(options?.method, 'PUT');
    assert.equal(new Headers(options?.headers).get('If-Match'), '"4"');
    assert.deepEqual(JSON.parse(String(options?.body)), { archived: true });
    return Response.json({ ...professor, archived: true, version: 5 });
  };
  const result = await new AcademicClient('https://academic.example.test', async () => 'access-token', request)
    .archiveProfessor('professor-1', 4);
  assert.equal(result.archived, true);
});
