import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCourse, deleteCourse, getCourses, updateCourse } from '../lib/api';
import { CoursesPage } from './CoursesPage';

vi.mock('../lib/api', () => ({
  createCourse: vi.fn(),
  deleteCourse: vi.fn(),
  getCourses: vi.fn(),
  updateCourse: vi.fn(),
}));

const mockedCreateCourse = vi.mocked(createCourse);
const mockedDeleteCourse = vi.mocked(deleteCourse);
const mockedGetCourses = vi.mocked(getCourses);
const mockedUpdateCourse = vi.mocked(updateCourse);

describe('CoursesPage', () => {
  beforeEach(() => {
    mockedGetCourses.mockResolvedValue({
      results: [{ id: 'course-1', name: 'Bacharelado em Ciência da Computação', code: 'BCC' }],
      total: 1,
      meta: { page: 0, limit: 10, total: 1, totalPages: 1 },
    });
    mockedCreateCourse.mockResolvedValue({ id: 'course-2', name: 'Sistemas de Informação', code: 'BSI' });
    mockedUpdateCourse.mockResolvedValue({ id: 'course-1', name: 'Ciência da Computação', code: 'BCC' });
    mockedDeleteCourse.mockResolvedValue(undefined);
  });

  it('deve oferecer o CRUD completo de cursos', async () => {
    const user = userEvent.setup();
    render(<CoursesPage />);

    expect(await screen.findByRole('heading', { name: 'Cursos' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome do curso'), 'Sistemas de Informação');
    await user.type(screen.getByLabelText('Código (opcional)'), 'bsi');
    await user.click(screen.getByRole('button', { name: 'Criar curso' }));
    await waitFor(() => expect(mockedCreateCourse).toHaveBeenCalledWith('Sistemas de Informação', 'bsi'));

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const nameInput = screen.getByLabelText('Nome do curso');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ciência da Computação');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(mockedUpdateCourse).toHaveBeenCalledWith('course-1', {
      name: 'Ciência da Computação',
      code: 'BCC',
    }));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(mockedDeleteCourse).toHaveBeenCalledWith('course-1'));
  });
});
