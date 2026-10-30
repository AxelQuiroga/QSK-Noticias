import { getArticlesByTopic } from './articles';
import { getTodasNoticiasOle } from './ole';
import { combinarNoticiasDeportes } from './deportes-feed';

/** Feed unificado de la sección Deportes, ordenado por fecha y sin duplicar
 * un enlace de Olé que ya esté citado por una publicación propia de QSK. */
export async function getNoticiasDeportes() {
  const [articulosQsk, noticiasOle] = await Promise.all([
    getArticlesByTopic('Deportes'),
    Promise.resolve(getTodasNoticiasOle()),
  ]);

  return combinarNoticiasDeportes(articulosQsk, noticiasOle);
}
