import { getArticlesByTopic } from './articles';
import { getNoticiasOle } from './ole';
import { combinarNoticiasDeportes } from './deportes-feed';

/** Feed unificado de la sección Deportes, ordenado por fecha y sin duplicar
 * un enlace de Olé que ya esté citado por una publicación propia de QSK. */
export async function getNoticiasDeportes() {
  const [articulosQsk, noticiasOle] = await Promise.all([
    getArticlesByTopic('Deportes'),
    Promise.resolve(getNoticiasOle(1000)),
  ]);

  return combinarNoticiasDeportes(articulosQsk, noticiasOle);
}
