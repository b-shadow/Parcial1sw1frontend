import { BpmnModdle } from 'bpmn-moddle';

type NodoFlujoPayload = {
  idNodo: string;
  tipoNodo: 'INICIO' | 'ACTIVIDAD' | 'DECISION' | 'FIN';
  nombre: string;
  descripcion?: string;
  departamentoId?: string;
  prioridad?: number;
  reglasNodo?: unknown[];
  posicionX?: number;
  posicionY?: number;
  esInicial?: boolean;
  esFinal?: boolean;
};

type TransicionFlujoPayload = {
  idTransicion: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  nombre: string;
  condiciones: unknown[];
  orden: number;
  activa: boolean;
};

type DepartamentoLane = {
  id: string;
  nombre: string;
};

type Bounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const moddle = new (BpmnModdle as unknown as new () => any)();

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function normalizarNombreTransicion(nombre?: string | null): string {
  const limpio = String(nombre ?? '').trim();
  return limpio.length > 0 ? limpio : 'Texto';
}

function resolveLaneId(node: NodoFlujoPayload, lanes: DepartamentoLane[]): string {
  const deptoId = node.departamentoId?.trim();
  if (!deptoId) {
    return lanes[0]?.id ?? 'SIN_DEPTO';
  }
  const found = lanes.find((lane) => lane.id === deptoId);
  return found ? found.id : lanes[0]?.id ?? 'SIN_DEPTO';
}

function resolveLaneIdByBounds(nodeBounds: Bounds | undefined, laneBounds: Map<string, Bounds>): string | undefined {
  if (!nodeBounds) {
    return undefined;
  }

  const centerX = nodeBounds.x + nodeBounds.w / 2;
  const centerY = nodeBounds.y + nodeBounds.h / 2;
  for (const [laneId, bounds] of laneBounds.entries()) {
    const insideX = centerX >= bounds.x && centerX <= bounds.x + bounds.w;
    const insideY = centerY >= bounds.y && centerY <= bounds.y + bounds.h;
    if (insideX && insideY) {
      return laneId;
    }
  }
  return undefined;
}

export function flowToBpmnXml(
  flowName: string,
  nodes: NodoFlujoPayload[],
  transitions: TransicionFlujoPayload[],
  departments: DepartamentoLane[],
): string {
  const laneCandidates: DepartamentoLane[] = departments.length
    ? departments
    : [{ id: 'SIN_DEPTO', nombre: 'Sin departamento' }];

  const lanes = laneCandidates.map((lane) => ({
    id: sanitizeId(lane.id),
    name: lane.nombre,
  }));

  const laneRefs = new Map<string, string[]>();
  for (const lane of lanes) {
    laneRefs.set(lane.id, []);
  }

  const typeTag = (tipo: NodoFlujoPayload['tipoNodo']): string => {
    if (tipo === 'INICIO') {
      return 'startEvent';
    }
    if (tipo === 'FIN') {
      return 'endEvent';
    }
    if (tipo === 'DECISION') {
      return 'exclusiveGateway';
    }
    return 'task';
  };

  const nodeById = new Map<string, NodoFlujoPayload>();
  for (const node of nodes) {
    nodeById.set(node.idNodo, node);
    const laneId = resolveLaneId(node, lanes as unknown as DepartamentoLane[]);
    if (!laneRefs.has(laneId)) {
      laneRefs.set(laneId, []);
    }
    laneRefs.get(laneId)!.push(node.idNodo);
  }

  const laneHeight = 180;
  const laneStartX = 90;
  const laneMinWidth = 1400;
  const laneRightPadding = 260;
  const startY = 80;
  const elementSize = (tipo: NodoFlujoPayload['tipoNodo']) => {
    if (tipo === 'INICIO' || tipo === 'FIN') {
      return { w: 36, h: 36 };
    }
    if (tipo === 'DECISION') {
      return { w: 50, h: 50 };
    }
    return { w: 120, h: 70 };
  };

  const shapeBounds = new Map<string, Bounds>();
  const orderedNodes = [...nodes];
  for (let i = 0; i < orderedNodes.length; i += 1) {
    const node = orderedNodes[i];
    const laneId = resolveLaneId(node, lanes as unknown as DepartamentoLane[]);
    const laneIndex = Math.max(
      0,
      lanes.findIndex((l) => l.id === laneId),
    );
    const size = elementSize(node.tipoNodo);
    const defaultX = 220 + i * 220;
    const defaultY = startY + laneIndex * laneHeight + (laneHeight - size.h) / 2;
    shapeBounds.set(node.idNodo, {
      x: Number.isFinite(node.posicionX) ? (node.posicionX as number) : defaultX,
      y: Number.isFinite(node.posicionY) ? (node.posicionY as number) : defaultY,
      w: size.w,
      h: size.h,
    });
  }

  let maxNodeRight = laneStartX;
  for (const bounds of shapeBounds.values()) {
    maxNodeRight = Math.max(maxNodeRight, bounds.x + bounds.w);
  }
  const laneWidth = Math.max(laneMinWidth, Math.ceil(maxNodeRight - laneStartX + laneRightPadding));

  const laneXml = lanes
    .map((lane) => {
      const refs = laneRefs.get(lane.id) ?? [];
      const refsXml = refs.map((ref) => `<bpmn:flowNodeRef>${xmlEscape(ref)}</bpmn:flowNodeRef>`).join('');
      return `<bpmn:lane id="lane_${xmlEscape(lane.id)}" name="${xmlEscape(lane.name)}">${refsXml}</bpmn:lane>`;
    })
    .join('');

  const nodesXml = orderedNodes
    .map((node) => {
      const tag = typeTag(node.tipoNodo);
      return `<bpmn:${tag} id="${xmlEscape(node.idNodo)}" name="${xmlEscape(node.nombre || node.idNodo)}" />`;
    })
    .join('');

  const transitionsXml = transitions
    .map((t) => {
      return `<bpmn:sequenceFlow id="${xmlEscape(t.idTransicion)}" sourceRef="${xmlEscape(t.nodoOrigenId)}" targetRef="${xmlEscape(t.nodoDestinoId)}" name="${xmlEscape(normalizarNombreTransicion(t.nombre))}" />`;
    })
    .join('');

  const laneShapesXml = lanes
    .map((lane, index) => {
      const y = startY + index * laneHeight;
      return `<bpmndi:BPMNShape id="shape_lane_${xmlEscape(lane.id)}" bpmnElement="lane_${xmlEscape(lane.id)}" isHorizontal="true"><dc:Bounds x="${laneStartX}" y="${y}" width="${laneWidth}" height="${laneHeight}" /></bpmndi:BPMNShape>`;
    })
    .join('');

  const nodeShapesXml = orderedNodes
    .map((node) => {
      const b = shapeBounds.get(node.idNodo)!;
      return `<bpmndi:BPMNShape id="shape_${xmlEscape(node.idNodo)}" bpmnElement="${xmlEscape(node.idNodo)}"><dc:Bounds x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" /></bpmndi:BPMNShape>`;
    })
    .join('');

  const edgeXml = transitions
    .map((t) => {
      const source = shapeBounds.get(t.nodoOrigenId);
      const target = shapeBounds.get(t.nodoDestinoId);
      if (!source || !target) {
        return '';
      }
      const x1 = source.x + source.w;
      const y1 = source.y + source.h / 2;
      const x2 = target.x;
      const y2 = target.y + target.h / 2;
      return `<bpmndi:BPMNEdge id="edge_${xmlEscape(t.idTransicion)}" bpmnElement="${xmlEscape(t.idTransicion)}"><di:waypoint x="${x1}" y="${y1}" /><di:waypoint x="${x2}" y="${y2}" /></bpmndi:BPMNEdge>`;
    })
    .join('');

  const processId = `Process_${sanitizeId(flowName || 'Flujo')}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_${sanitizeId(flowName || 'Flujo')}"
  targetNamespace="http://workflow.local/bpmn">
  <bpmn:process id="${processId}" isExecutable="false" name="${xmlEscape(flowName || 'Flujo')}">
    <bpmn:laneSet id="lane_set_1">${laneXml}</bpmn:laneSet>
    ${nodesXml}
    ${transitionsXml}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="diagram_1">
    <bpmndi:BPMNPlane id="plane_1" bpmnElement="${processId}">
      ${laneShapesXml}
      ${nodeShapesXml}
      ${edgeXml}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

function mapNodoTipoFromBpmn(type: string): 'INICIO' | 'ACTIVIDAD' | 'DECISION' | 'FIN' | null {
  if (type === 'bpmn:StartEvent') {
    return 'INICIO';
  }
  if (type === 'bpmn:EndEvent') {
    return 'FIN';
  }
  if (type === 'bpmn:ExclusiveGateway') {
    return 'DECISION';
  }
  if (type === 'bpmn:Task' || type === 'bpmn:UserTask' || type === 'bpmn:ServiceTask' || type === 'bpmn:ScriptTask') {
    return 'ACTIVIDAD';
  }
  return null;
}

export async function bpmnXmlToFlowPayload(xml: string): Promise<{
  nodos: NodoFlujoPayload[];
  transiciones: TransicionFlujoPayload[];
  layout: Record<string, unknown>;
}> {
  const parsed = await moddle.fromXML(xml);
  const definitions = parsed.rootElement as any;
  const process = (definitions.rootElements || []).find((element: any) => element.$type === 'bpmn:Process');
  if (!process) {
    throw new Error('No se encontro un proceso BPMN.');
  }

  const shapeMap = new Map<string, Bounds>();
  const laneShapeBounds = new Map<string, Bounds>();
  const diagram = (definitions.diagrams || [])[0];
  const plane = diagram?.plane;
  const planeElements = plane?.planeElement || [];
  for (const element of planeElements) {
    if (element.$type === 'bpmndi:BPMNShape' && element.bpmnElement?.id && element.bounds) {
      const bounds = {
        x: Number(element.bounds.x ?? 0),
        y: Number(element.bounds.y ?? 0),
        w: Number(element.bounds.width ?? 0),
        h: Number(element.bounds.height ?? 0),
      };
      const rawElementId = String(element.bpmnElement.id);
      shapeMap.set(rawElementId, bounds);

      const laneElement = element.bpmnElement?.$type === 'bpmn:Lane' || rawElementId.startsWith('lane_');
      if (laneElement) {
        const laneId = rawElementId.startsWith('lane_') ? rawElementId.substring(5) : rawElementId;
        laneShapeBounds.set(laneId, bounds);
      }
    }
  }

  const nodeToLane = new Map<string, string>();
  for (const laneSet of process.laneSets || []) {
    for (const lane of laneSet.lanes || []) {
      const laneRawId = String(lane.id || '');
      const laneId = laneRawId.startsWith('lane_') ? laneRawId.substring(5) : laneRawId;
      for (const nodeRef of lane.flowNodeRef || []) {
        if (nodeRef?.id) {
          nodeToLane.set(nodeRef.id, laneId || '');
        }
      }
    }
  }

  const nodos: NodoFlujoPayload[] = [];
  const transiciones: TransicionFlujoPayload[] = [];

  for (const element of process.flowElements || []) {
    if (element.$type === 'bpmn:SequenceFlow') {
      transiciones.push({
        idTransicion: element.id,
        nodoOrigenId: element.sourceRef?.id ?? '',
        nodoDestinoId: element.targetRef?.id ?? '',
        nombre: normalizarNombreTransicion(element.name),
        condiciones: [],
        orden: transiciones.length + 1,
        activa: true,
      });
      continue;
    }

    const tipoNodo = mapNodoTipoFromBpmn(element.$type);
    if (!tipoNodo) {
      continue;
    }

    const pos = shapeMap.get(element.id);
    const laneByBounds = resolveLaneIdByBounds(pos, laneShapeBounds);
    nodos.push({
      idNodo: element.id,
      tipoNodo,
      nombre: element.name ?? element.id,
      descripcion: '',
      departamentoId: laneByBounds || nodeToLane.get(element.id) || undefined,
      prioridad: 1,
      reglasNodo: [],
      posicionX: pos?.x ?? 0,
      posicionY: pos?.y ?? 0,
      esInicial: tipoNodo === 'INICIO',
      esFinal: tipoNodo === 'FIN',
    });
  }

  return {
    nodos,
    transiciones,
    layout: { bpmnXml: xml },
  };
}
