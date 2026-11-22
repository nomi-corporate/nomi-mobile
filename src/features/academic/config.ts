import { environment } from '@/config/environment';
import { normalizeAcademicApiUrl } from './urlPolicy';

export { normalizeAcademicApiUrl } from './urlPolicy';

export function loadAcademicApiUrl(value = environment.academicApiUrl): string {
  return normalizeAcademicApiUrl(value);
}
