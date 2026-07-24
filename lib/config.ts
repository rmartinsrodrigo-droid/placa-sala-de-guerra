// Coordenadas dos slots no template.pdf (A3 landscape, 1190.55 x 841.89 pts).
// Origem: canto inferior esquerdo. Y cresce pra cima.
// Este template só tem UM painel central com "War Room" no topo, athié|wohnrath
// no rodapé, e um espaço vazio no meio pra colocar o logo do cliente.

export type Slot = { x: number; y: number; width: number; height: number };

// Onde vai o logo do cliente — bounding box centrado no espaço vazio da placa.
// Coordenadas medidas no Illustrator (referência central: X=595.2755, Y=438.8898,
// L=423, A=204) e convertidas pro sistema do pdf-lib (origem no canto inferior
// esquerdo, Y cresce pra cima).
export const LOGO_CLIENTE_SLOT: Slot = { x: 383.78, y: 301, width: 423, height: 204 };
