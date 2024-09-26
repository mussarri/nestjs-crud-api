import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto/auth.dto';
import * as pactum from 'pactum';
import { EditUserDto } from 'src/user/dto';
import { createBookmarkDto, editBookmarkDto } from 'src/bookmark/dto';

describe('app e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    prisma = app.get(PrismaService);
    prisma.cleanDb();
    await app.init();
    await app.listen(3000);
    pactum.request.setBaseUrl('http://localhost:3000');
  });
  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'email1@email.com',
      password: '123',
    };
    describe('signup', () => {
      it('should signup', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
      it('should error if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });
      it('should error if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });
      it('should error if no body', () => {
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });
    });

    describe('signin', () => {
      it('should signin', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
      it('should error if email empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            password: dto.password,
          })
          .expectStatus(400);
      });
      it('should error if password empty', () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody({
            email: dto.email,
          })
          .expectStatus(400);
      });
      it('should error if no body', () => {
        return pactum.spec().post('/auth/signin').expectStatus(400);
      });
    });
  });
  describe('User', () => {
    describe('get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .expectStatus(200);
      });
    });
    describe('edit user', () => {
      const dto: EditUserDto = {
        firstname: 'ali',
        email: 'email21@email.com',
      };
      it('should update user', () => {
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstname)
          .expectBodyContains(dto.email);
      });
    });
  });

  describe('Bookmark', () => {
    describe('get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('create bookmark', () => {
      const dto: createBookmarkDto = {
        title: 'title',
        link: 'link',
        description: 'desc',
      };
      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });

      it('should error if title is empty', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withBody({ link: 'link', description: 'desc' })
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });

      it('should error if link is empty', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withBody({ title: 'link', description: 'desc' })
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });

      it('should error if body is empty', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });
    });

    describe('get bookmarks', () => {
      it('should get bookmarks after created', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });

      it('should error if id not found', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', 'asd')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });
    });
    describe('edit bookmark', () => {
      it('should error if id not found', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', 'asd')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });

      it('should edit bookmark by id', () => {
        const dto: editBookmarkDto = {
          title: 'edited title',
          link: 'edited link',
        };
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withBody(dto)
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.link);
      });
    });
    describe('delete bookmark', () => {
      it('should delete bookmark', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(204);
      });
      it('should error if id not found', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', 'asd')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(400);
      });
      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
