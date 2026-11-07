"""
Importa o catálogo de arquivos-base/ para o app.

  python scripts/importar_produtos.py

- Lê arquivos-base/produtos_com_descricao.xlsx
- Copia as fotos existentes para public/produtos/<codigo>/
- Gera src/data/produtos.ts (usado por src/data/seed.ts)

A planilha não traz estoque, cores, fornecedor nem personalizações:
esses campos vêm da tabela CURADORIA abaixo (valores de exemplo).
Nomes e categorias também são padronizados aqui.
"""
import json
import os
import re
import shutil
import sys

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(RAIZ, 'arquivos-base')
FOTOS_ORIGEM = os.path.join(BASE, 'PRODUTOS', 'PRODUTOS')
FOTOS_DESTINO = os.path.join(RAIZ, 'public', 'produtos')
SAIDA_TS = os.path.join(RAIZ, 'src', 'data', 'produtos.ts')

# Fora do catálogo por decisão da Lonny
IGNORAR = {'14885'}

# Fornecedores e personalizações referenciam os ids de src/data/seed.ts
# (ids gerados por scripts/importar_personalizacoes.py)
SILK, LASER, LASER_C, SILK_TX, TRANSF, TRANSF_D = 'pz-scr2', 'pz-lsr1', 'pz-las1', 'pz-txp1', 'pz-trs1', 'pz-trd1'

# codigo: (nome, categoria, foto principal, estoque, cores, fornecedor, personalizações)
CURADORIA = {
    '11103': ('Borracha branca em TPR', 'Escritório & Papelaria', '11103_3.jpg', 1800, ['Branco', 'Preto'], 'sp-1', [SILK]),
    '11104': ('Bateria portátil com carregador por indução 4.000 mAh', 'Tecnologia', '11104_13.jpg', 12, ['Vermelho', 'Prata', 'Preto'], 'sp-1', [LASER, SILK]),
    '11110': ('Caneta esferográfica metálica twist', 'Escritório & Papelaria', '11110_3.jpg', 2400, ['Vermelho', 'Azul', 'Preto', 'Prata'], 'sp-3', [LASER_C, LASER]),
    '11112': ('Mochila para notebook 15,6" em 1680D', 'Mochilas & Bolsas', '11112_1.jpg', 8, ['Azul', 'Vinho'], 'sp-1', [SILK_TX, TRANSF, LASER]),
    '11113': ('Mochila para notebook 15,6" em 600D', 'Mochilas & Bolsas', '11113_5.jpg', 64, ['Preto'], 'sp-1', [SILK_TX, TRANSF, TRANSF_D]),
    '11116': ('Sacola esportiva dobrável em ripstop', 'Mochilas & Bolsas', '11116_13.jpg', 420, ['Laranja', 'Verde-limão'], 'sp-2', [SILK_TX, TRANSF, TRANSF_D]),
    '11117': ('Pochete em ripstop', 'Mochilas & Bolsas', '11117_1.jpg', 150, ['Laranja', 'Preto', 'Azul'], 'sp-2', [SILK_TX, TRANSF]),
    '11128': ('Squeeze 610 ml com bico flip', 'Squeezes & Garrafas', '11128_4.jpg', 300, ['Verde', 'Azul', 'Rosa'], 'sp-1', [SILK]),
    '11130': ('Squeeze em Tritan™ 790 ml', 'Squeezes & Garrafas', '11130_1.jpg', 210, ['Azul', 'Rosa', 'Transparente'], 'sp-1', [SILK]),
    '11131': ('Kit de 4 lixas de unha', 'Bem-estar & Cuidados', '11131_8.jpg', 640, ['Preto'], 'sp-3', [SILK]),
    '11140': ('Mosquetão em alumínio', 'Acessórios', '11140_3.jpg', 380, ['Rosa', 'Azul', 'Preto', 'Verde'], 'sp-3', [LASER]),
    '11142': ('Guarda-chuva com abertura automática', 'Dias de chuva', '11142_6.jpg', 15, ['Preto'], 'sp-2', [SILK_TX, TRANSF]),
    '11143': ('Capa de chuva tamanho único', 'Dias de chuva', '11143_3.jpg', 500, ['Vermelho', 'Azul', 'Amarelo', 'Transparente'], 'sp-2', [TRANSF, TRANSF_D]),
    '22900': ('Sacola non-woven com alças longas · 37 × 41 cm', 'Sacolas ecológicas', '22900_7.jpg', 3000,
              ['Laranja', 'Verde', 'Azul-marinho', 'Branco', 'Amarelo', 'Verde-limão', 'Azul', 'Vermelho', 'Preto'], 'sp-2', [SILK_TX, TRANSF, TRANSF_D]),
    '22901': ('Sacola mochila non-woven com cordão · 33 × 40 cm', 'Sacolas ecológicas', '22901_12.jpg', 1500,
              ['Rosa', 'Branco', 'Amarelo', 'Bege', 'Verde', 'Preto', 'Cinza', 'Azul', 'Azul-marinho', 'Laranja', 'Azul-claro', 'Verde-limão', 'Vermelho', 'Roxo'], 'sp-2', [SILK_TX, TRANSF, TRANSF_D]),
    '22902': ('Sacola non-woven com alça vazada · 35,5 × 39 cm', 'Sacolas ecológicas', '22902_6.jpg', 2200,
              ['Laranja', 'Azul-marinho', 'Preto', 'Vermelho', 'Roxo', 'Amarelo', 'Bege', 'Branco', 'Azul'], 'sp-2', [SILK_TX, TRANSF_D]),
    '22903': ('Sacola non-woven com alça vazada · 25 × 35 cm', 'Sacolas ecológicas', '22903_28.jpg', 2600,
              ['Rosa', 'Amarelo', 'Bege', 'Azul-turquesa', 'Azul-marinho', 'Vermelho', 'Verde-limão', 'Laranja', 'Azul', 'Branco', 'Preto'], 'sp-2', [SILK_TX, TRANSF_D]),
    '22904': ('Sacola non-woven com alças · 27 × 35 cm', 'Sacolas ecológicas', '22904_7.jpg', 1900,
              ['Rosa', 'Kraft', 'Azul', 'Roxo', 'Branco', 'Azul-claro', 'Azul-marinho', 'Amarelo', 'Vermelho', 'Preto', 'Verde', 'Laranja'], 'sp-2', [SILK_TX, TRANSF, TRANSF_D]),
    '22905': ('Sacola non-woven horizontal com alças · 48 × 38 cm', 'Sacolas ecológicas', '22905_24.jpg', 1200,
              ['Vermelho', 'Azul-marinho', 'Verde', 'Branco', 'Preto'], 'sp-2', [SILK_TX, TRANSF, TRANSF_D]),
}

# Descrições ausentes na planilha
DESCRICAO_PADRAO = {
    '11142': 'Guarda-chuva em POE com abertura automática e cabo curvo. Gomos amplos para a gravação da logo.',
}


def numero_foto(nome):
    m = re.search(r'_(\d+)\.', nome)
    return int(m.group(1)) if m else 0


def main():
    ws = openpyxl.load_workbook(os.path.join(BASE, 'produtos_com_descricao.xlsx')).active
    linhas = list(ws.iter_rows(values_only=True))
    cab = [str(c).strip().lower() for c in linhas[0]]
    col = {k: cab.index(k) for k in ('codigo', 'descricao', 'valor', 'imagens')}

    if os.path.isdir(FOTOS_DESTINO):
        shutil.rmtree(FOTOS_DESTINO)

    produtos, faltando = [], 0
    for r in linhas[1:]:
        codigo = str(r[col['codigo']]).strip()
        if codigo in IGNORAR:
            continue
        if codigo not in CURADORIA:
            sys.exit(f'Código {codigo} não está em CURADORIA — adicione nome, categoria etc.')
        nome, categoria, principal, estoque, cores, fornecedor, pz = CURADORIA[codigo]

        fotos = []
        for caminho in str(r[col['imagens']] or '').splitlines():
            caminho = caminho.strip()
            origem = os.path.join(FOTOS_ORIGEM, caminho)
            if not caminho or not os.path.exists(origem):
                faltando += bool(caminho)
                continue
            arquivo = os.path.basename(caminho)
            destino = os.path.join(FOTOS_DESTINO, codigo, arquivo)
            os.makedirs(os.path.dirname(destino), exist_ok=True)
            shutil.copy2(origem, destino)
            fotos.append(arquivo)
        if principal not in fotos:
            sys.exit(f'{codigo}: foto principal {principal} não encontrada')
        fotos.sort(key=lambda f: (f != principal, numero_foto(f)))

        descricao = re.sub(r'\s*\|\s*$', '', str(r[col['descricao']] or '').strip()) or DESCRICAO_PADRAO.get(codigo, '')
        produtos.append({
            'id': f'pr-{codigo}',
            'codigo': codigo,
            'nome': nome,
            'categoria': categoria,
            'descricao': descricao,
            'estoque': estoque,
            'cores': cores,
            'valor': float(r[col['valor']] or 0),
            'imagens': [f'/produtos/{codigo}/{f}' for f in fotos],
            'fornecedorId': fornecedor,
            'personalizacaoIds': pz,
        })

    ts = (
        '/* ARQUIVO GERADO por scripts/importar_produtos.py — não edite à mão.\n'
        '   Fonte: arquivos-base/produtos_com_descricao.xlsx + fotos em public/produtos/.\n'
        '   "valor" = custo unitário (a margem é aplicada no pedido). */\n'
        "import type { Product } from '../types'\n\n"
        f'export const PRODUTOS: Product[] = {json.dumps(produtos, ensure_ascii=False, indent=2)}\n'
    )
    with open(SAIDA_TS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(ts)
    total = sum(len(p['imagens']) for p in produtos)
    print(f'{len(produtos)} produtos, {total} fotos copiadas, {faltando} caminhos da planilha sem arquivo')


if __name__ == '__main__':
    main()
