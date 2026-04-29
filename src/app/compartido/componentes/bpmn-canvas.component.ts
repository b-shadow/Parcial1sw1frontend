import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { environment } from '../../../environments/environment';

export type BpmnElementClickEvent = {
  id: string;
  type: string;
  name: string;
};

@Component({
  selector: 'app-bpmn-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
      <div class="space-y-2">
        <div #toolbar class="flex items-center gap-2 overflow-x-auto rounded-lg border border-violet-300/50 bg-white/85 p-1 dark:border-violet-500/20 dark:bg-violet-950/60">
          <button type="button" (click)="zoomFit()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
            Ajustar vista
          </button>
          @if (mode === 'modeler') {
            <button type="button" (click)="emitXml()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
              Exportar XML
            </button>
            <button type="button" (click)="aumentarAnchoCarriles()" class="rounded-lg border border-violet-300/70 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-400/30 dark:text-violet-100">
              Aumentar ancho
            </button>
          }
        </div>
        <div
          #canvas
          [style.height.px]="currentCanvasHeight"
          tabindex="0"
          (keydown)="onCanvasKeydown($event)"
          class="bpmn-canvas-host w-full rounded-xl border border-violet-300/50 bg-white/90 dark:border-violet-500/20 dark:bg-violet-950/50"
          [class.overflow-auto]="mode === 'modeler'"
          [class.overflow-hidden]="mode !== 'modeler'"
        ></div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .palette-inline {
        position: static !important;
        display: flex !important;
        align-items: center;
        flex: 1 1 auto;
        margin: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      :host ::ng-deep .palette-inline .entry,
      :host ::ng-deep .palette-inline .separator {
        float: none !important;
      }

      :host ::ng-deep .palette-inline .djs-palette-entries {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 0.25rem;
        margin: 0 !important;
        min-width: max-content;
      }

      :host ::ng-deep .palette-inline .separator {
        display: none !important;
      }

      :host ::ng-deep .palette-inline .entry {
        display: none !important;
        border-radius: 0.5rem;
      }

      :host ::ng-deep .palette-inline .entry.bpmn-icon-hand-tool,
      :host ::ng-deep .palette-inline .entry.bpmn-icon-start-event-none,
      :host ::ng-deep .palette-inline .entry.bpmn-icon-task,
      :host ::ng-deep .palette-inline .entry.bpmn-icon-gateway-xor,
      :host ::ng-deep .palette-inline .entry.bpmn-icon-end-event-none {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
      }

      :host ::ng-deep .djs-context-pad .entry {
        display: none !important;
      }

      :host ::ng-deep .djs-context-pad .entry[data-action='connect'] {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
      }

      :host ::ng-deep .djs-element.tramite-nodo-completado .djs-visual > :nth-child(1) {
        fill: #dcfce7 !important;
        stroke: #16a34a !important;
        stroke-width: 2px !important;
      }

      :host ::ng-deep .djs-element.tramite-nodo-activo .djs-visual > :nth-child(1) {
        fill: #fef9c3 !important;
        stroke: #ca8a04 !important;
        stroke-width: 2px !important;
      }

      :host ::ng-deep .djs-element.tramite-nodo-no-ejecutado .djs-visual > :nth-child(1) {
        fill: #fee2e2 !important;
        stroke: #dc2626 !important;
        stroke-width: 2px !important;
      }

      :host ::ng-deep .djs-element.tramite-fin-completado .djs-visual > :nth-child(1) {
        fill: #dcfce7 !important;
        stroke: #16a34a !important;
        stroke-width: 2px !important;
      }

    `,
  ],
})
export class BpmnCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() xml = '';
  @Input() mode: 'viewer' | 'modeler' = 'viewer';
  @Input() height = 520;
  @Input() nodosActivos: string[] = [];
  @Input() nodosCompletados: string[] = [];
  @Input() marcarNoEjecutados = false;
  @Input() marcarFinCompletado = false;
  @Output() xmlChange = new EventEmitter<string>();
  @Output() renderError = new EventEmitter<string>();
  @Output() elementClick = new EventEmitter<BpmnElementClickEvent>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('toolbar', { static: true }) toolbarRef!: ElementRef<HTMLDivElement>;

  private instance: any;
  private ready = false;
  private lastXml = '';
  currentCanvasHeight = 520;
  private pendingViewerHeightTimer: ReturnType<typeof setTimeout> | null = null;
  private ajustandoCarriles = false;
  private importandoXml = false;
  private ajustandoViewbox = false;
  private nodosActivosAplicados = new Set<string>();
  private nodosCompletadosAplicados = new Set<string>();
  private nodosNoEjecutadosAplicados = new Set<string>();
  private nodosFinCompletadosAplicados = new Set<string>();

  ngAfterViewInit(): void {
    this.createInstance();
    this.ready = true;
    this.importXml(this.xml);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['height']) {
      const nuevoAlto = Number(changes['height'].currentValue ?? this.height);
      this.currentCanvasHeight = Number.isFinite(nuevoAlto) && nuevoAlto > 0 ? nuevoAlto : this.height;
    }
    if (!this.ready) {
      return;
    }
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.destroyInstance();
      this.currentCanvasHeight = this.height;
      this.createInstance();
      this.importXml(this.xml);
      return;
    }
    if (changes['xml'] && !changes['xml'].firstChange) {
      this.importXml(this.xml);
      return;
    }
    if (changes['nodosActivos'] || changes['nodosCompletados'] || changes['marcarNoEjecutados'] || changes['marcarFinCompletado']) {
      this.aplicarMarcadoresTramite();
    }
  }

  ngOnDestroy(): void {
    if (this.pendingViewerHeightTimer) {
      clearTimeout(this.pendingViewerHeightTimer);
      this.pendingViewerHeightTimer = null;
    }
    this.destroyInstance();
  }

  zoomFit(): void {
    if (!this.instance) {
      return;
    }
    this.ajustarAlturaViewerAutomaticamente();
    const canvas = this.instance.get('canvas');
    canvas.zoom('fit-viewport', 'auto');
    if (this.mode === 'modeler') {
      this.bloquearDesplazamientoVertical();
    }
  }

  async emitXml(): Promise<void> {
    if (this.mode !== 'modeler' || !this.instance) {
      return;
    }
    try {
      const result = await this.instance.saveXML({ format: true });
      this.lastXml = result.xml ?? '';
      this.xmlChange.emit(this.lastXml);
    } catch {
      this.renderError.emit('No se pudo exportar XML BPMN.');
    }
  }

  private createInstance(): void {
    const container = this.canvasRef.nativeElement;
    if (this.mode === 'modeler') {
      this.instance = new BpmnModeler({ container });
      const eventBus = this.instance.get('eventBus');
      eventBus.on('create.end', (event: any) => {
        const shape = event?.context?.shape;
        this.forzarNodosDentroDeCarriles(shape ? [shape] : []);
      });
      eventBus.on('shape.move.end', (event: any) => {
        const shapes = event?.context?.shapes ?? [];
        const delta = event?.context?.delta ?? { x: 0, y: 0 };
        this.revertirMovimientoDeCarriles(Array.isArray(shapes) ? shapes : [], delta);
        this.forzarNodosDentroDeCarriles(Array.isArray(shapes) ? shapes : []);
        this.registrarEventoUi('MOVER_NODO_EDITOR_GRAFICO', 'Movimiento de nodo en editor grafico BPMN.', {
          cantidadNodos: Array.isArray(shapes) ? shapes.length : 0,
        });
      });
      eventBus.on('connect.hover', 500, (event: any) => {
        const context = event?.context;
        if (!context) {
          return;
        }
        const source = context.source;
        const target = context.target;
        if (!this.esFlowNodeBpmn(source) || !this.esFlowNodeBpmn(target)) {
          context.canExecute = false;
          return;
        }
        context.canExecute = { type: 'bpmn:SequenceFlow' };
      });
      eventBus.on('connect.end', (event: any) => {
        const connection = event?.context?.connection;
        if (!connection) {
          return;
        }
        queueMicrotask(async () => {
          if (!this.garantizarConexionSequenceFlow(connection)) {
            return;
          }
          this.asignarNombrePorDefectoTransicion(connection);
          this.registrarEventoUi('CREAR_TRANSICION_EDITOR_GRAFICO', 'Creacion de secuencia entre nodos en editor grafico.', {
            connectionId: connection?.id ?? null,
            sourceId: connection?.source?.id ?? null,
            targetId: connection?.target?.id ?? null,
          });
          await this.emitXml();
        });
      });
      eventBus.on('commandStack.changed', async () => {
        if (this.importandoXml) {
          return;
        }
        await this.emitXml();
      });
      eventBus.on('canvas.viewbox.changed', () => {
        this.bloquearDesplazamientoVertical();
      });
      eventBus.on('element.click', (event: any) => {
        this.logFlechaEnConsola(event);
        this.emitSequenceFlowClick(event);
      });
      eventBus.on('element.dblclick', (event: any) => this.emitElementClick(event));
      this.moverPaletaAToolbar();
    } else {
      this.instance = new BpmnViewer({ container });
      const eventBus = this.instance.get('eventBus');
      eventBus.on('element.click', (event: any) => {
        this.logFlechaEnConsola(event);
        this.emitSequenceFlowClick(event);
      });
      eventBus.on('element.dblclick', (event: any) => this.emitElementClick(event));
    }
  }

  private destroyInstance(): void {
    if (this.instance && typeof this.instance.destroy === 'function') {
      this.instance.destroy();
    }
    this.instance = null;
    this.ready = false;
    this.lastXml = '';
  }

  private async importXml(xml: string): Promise<void> {
    if (!this.instance || !xml || xml === this.lastXml) {
      return;
    }
    try {
      this.importandoXml = true;
      await this.instance.importXML(xml);
      this.lastXml = xml;
      this.zoomFit();
      this.moverPaletaAToolbar();
      this.aplicarMarcadoresTramite();
    } catch {
      this.renderError.emit('No se pudo renderizar el BPMN XML.');
    } finally {
      this.importandoXml = false;
    }
  }

  onCanvasKeydown(event: KeyboardEvent): void {
    if (this.mode !== 'modeler') {
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private forzarNodosDentroDeCarriles(shapes: any[]): void {
    if (this.mode !== 'modeler' || !this.instance || this.ajustandoCarriles) {
      return;
    }
    const candidatos = (shapes || []).filter((shape) => this.esNodoFlujo(shape));
    if (candidatos.length === 0) {
      return;
    }

    const elementRegistry = this.instance.get('elementRegistry');
    const modeling = this.instance.get('modeling');
    const lanes = (elementRegistry.getAll() as any[])
      .filter((el) => el.type === 'bpmn:Lane')
      .sort((a, b) => a.y - b.y);
    if (lanes.length === 0) {
      return;
    }

    const leftPadding = 56;
    const topPadding = 10;
    const bottomPadding = 10;
    const rightPadding = 220;
    const minLaneWidth = 1400;

    let requiredWidth = minLaneWidth;
    const ajustes: Array<{ shape: any; dx: number; dy: number }> = [];

    for (const shape of candidatos) {
      const lane = this.obtenerCarrilObjetivo(shape, lanes);
      if (!lane) {
        continue;
      }

      const minX = lane.x + leftPadding;
      const minY = lane.y + topPadding;
      const maxY = lane.y + lane.height - shape.height - bottomPadding;

      const nuevoX = shape.x < minX ? minX : shape.x;
      const nuevoY = Math.min(Math.max(shape.y, minY), maxY);

      requiredWidth = Math.max(requiredWidth, Math.ceil(nuevoX + shape.width - lane.x + rightPadding));

      const dx = nuevoX - shape.x;
      const dy = nuevoY - shape.y;
      if (dx !== 0 || dy !== 0) {
        ajustes.push({ shape, dx, dy });
      }
    }

    const laneWidthActual = Math.max(...lanes.map((lane) => lane.width));
    this.ajustandoCarriles = true;
    try {
      if (requiredWidth > laneWidthActual) {
        for (const lane of lanes) {
          modeling.resizeShape(lane, {
            x: lane.x,
            y: lane.y,
            width: requiredWidth,
            height: lane.height,
          });
        }
      }

      for (const ajuste of ajustes) {
        modeling.moveElements([ajuste.shape], { x: ajuste.dx, y: ajuste.dy });
      }
    } finally {
      this.ajustandoCarriles = false;
    }
  }

  aumentarAnchoCarriles(): void {
    if (this.mode !== 'modeler' || !this.instance || this.ajustandoCarriles) {
      return;
    }
    const elementRegistry = this.instance.get('elementRegistry');
    const modeling = this.instance.get('modeling');
    const lanes = (elementRegistry.getAll() as any[]).filter((el) => el.type === 'bpmn:Lane');
    if (lanes.length === 0) {
      return;
    }

    this.ajustandoCarriles = true;
    try {
      for (const lane of lanes) {
        modeling.resizeShape(lane, {
          x: lane.x,
          y: lane.y,
          width: lane.width + 600,
          height: lane.height,
        });
      }
    } finally {
      this.ajustandoCarriles = false;
    }
  }

  private esNodoFlujo(shape: any): boolean {
    if (!shape || shape.type === 'bpmn:Lane' || shape.type === 'label') {
      return false;
    }
    const bo = shape.businessObject;
    return Boolean(bo?.$instanceOf && bo.$instanceOf('bpmn:FlowNode'));
  }

  private obtenerCarrilObjetivo(shape: any, lanes: any[]): any | null {
    const centerY = shape.y + shape.height / 2;
    const porContencion = lanes.find((lane) => centerY >= lane.y && centerY <= lane.y + lane.height);
    if (porContencion) {
      return porContencion;
    }

    let elegido: any | null = null;
    let distanciaMin = Number.POSITIVE_INFINITY;
    for (const lane of lanes) {
      const laneCenter = lane.y + lane.height / 2;
      const dist = Math.abs(centerY - laneCenter);
      if (dist < distanciaMin) {
        distanciaMin = dist;
        elegido = lane;
      }
    }
    return elegido;
  }

  private revertirMovimientoDeCarriles(shapes: any[], delta: { x: number; y: number }): void {
    if (!this.instance || this.ajustandoCarriles || !delta) {
      return;
    }

    const lanesMovidos = (shapes || []).filter((shape) => shape?.type === 'bpmn:Lane');
    if (lanesMovidos.length === 0) {
      return;
    }

    const dx = Number(delta.x ?? 0);
    const dy = Number(delta.y ?? 0);
    if (dx === 0 && dy === 0) {
      return;
    }

    const modeling = this.instance.get('modeling');
    this.ajustandoCarriles = true;
    try {
      modeling.moveElements(lanesMovidos, { x: -dx, y: -dy });
    } finally {
      this.ajustandoCarriles = false;
    }
  }

  private ajustarAlturaViewerAutomaticamente(): void {
    if (this.mode !== 'viewer' || !this.instance) {
      this.currentCanvasHeight = this.height;
      return;
    }

    const elementRegistry = this.instance.get('elementRegistry');
    const elements = (elementRegistry?.getAll?.() as any[] | undefined) ?? [];
    if (elements.length === 0) {
      this.currentCanvasHeight = this.height;
      return;
    }

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const element of elements) {
      if (!element || element.type === 'label') {
        continue;
      }
      if (Array.isArray(element.waypoints) && element.waypoints.length > 0) {
        for (const point of element.waypoints) {
          const y = Number(point?.y ?? NaN);
          if (Number.isFinite(y)) {
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        continue;
      }
      const y = Number(element.y ?? NaN);
      const h = Number(element.height ?? 0);
      if (Number.isFinite(y)) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + Math.max(h, 0));
      }
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      this.currentCanvasHeight = this.height;
      return;
    }

    const contentHeight = Math.max(0, maxY - minY);
    const targetHeight = Math.max(220, Math.min(900, Math.ceil(contentHeight + 72)));
    if (targetHeight === this.currentCanvasHeight) {
      return;
    }
    if (this.pendingViewerHeightTimer) {
      clearTimeout(this.pendingViewerHeightTimer);
    }
    this.pendingViewerHeightTimer = setTimeout(() => {
      this.currentCanvasHeight = targetHeight;
      this.pendingViewerHeightTimer = null;
    }, 0);
  }

  private bloquearDesplazamientoVertical(): void {
    if (!this.instance || this.ajustandoViewbox) {
      return;
    }
    const canvas = this.instance.get('canvas');
    const box = canvas.viewbox();
    const yActual = Number(box?.y ?? 0);
    if (Math.abs(yActual) < 1) {
      return;
    }

    this.ajustandoViewbox = true;
    try {
      canvas.viewbox({
        x: Number(box?.x ?? 0),
        y: 0,
        width: Number(box?.width ?? 0),
        height: Number(box?.height ?? 0),
      });
    } finally {
      this.ajustandoViewbox = false;
    }
  }

  private moverPaletaAToolbar(): void {
    if (this.mode !== 'modeler') {
      return;
    }

    queueMicrotask(() => {
      const toolbar = this.toolbarRef?.nativeElement;
      const canvasHost = this.canvasRef?.nativeElement;
      if (!toolbar || !canvasHost) {
        return;
      }
      const palette = canvasHost.querySelector('.djs-palette') as HTMLElement | null;
      if (!palette) {
        return;
      }
      palette.classList.add('palette-inline');
      if (palette.parentElement !== toolbar) {
        toolbar.appendChild(palette);
      }
    });
  }

  private aplicarMarcadoresTramite(): void {
    if (!this.instance) {
      return;
    }
    const canvas = this.instance.get('canvas');
    if (!canvas?.addMarker || !canvas?.removeMarker) {
      return;
    }

    for (const id of this.nodosCompletadosAplicados) {
      canvas.removeMarker(id, 'tramite-nodo-completado');
    }
    for (const id of this.nodosActivosAplicados) {
      canvas.removeMarker(id, 'tramite-nodo-activo');
    }
    for (const id of this.nodosNoEjecutadosAplicados) {
      canvas.removeMarker(id, 'tramite-nodo-no-ejecutado');
    }
    for (const id of this.nodosFinCompletadosAplicados) {
      canvas.removeMarker(id, 'tramite-fin-completado');
    }

    this.nodosCompletadosAplicados.clear();
    this.nodosActivosAplicados.clear();
    this.nodosNoEjecutadosAplicados.clear();
    this.nodosFinCompletadosAplicados.clear();

    const completados = this.normalizarIds(this.nodosCompletados);
    const activos = this.normalizarIds(this.nodosActivos).filter((id) => !completados.includes(id));

    for (const id of completados) {
      canvas.addMarker(id, 'tramite-nodo-completado');
      this.nodosCompletadosAplicados.add(id);
    }
    for (const id of activos) {
      canvas.addMarker(id, 'tramite-nodo-activo');
      this.nodosActivosAplicados.add(id);
    }

    const elementRegistry = this.instance.get('elementRegistry');
    const elements = (elementRegistry?.getAll?.() as any[] | undefined) ?? [];

    if (this.marcarNoEjecutados) {
      for (const element of elements) {
        const bo = element?.businessObject;
        if (!bo?.$instanceOf || !bo.$instanceOf('bpmn:Task')) {
          continue;
        }
        const id = String(bo.id ?? element.id ?? '').trim();
        if (!id || completados.includes(id) || activos.includes(id)) {
          continue;
        }
        canvas.addMarker(id, 'tramite-nodo-no-ejecutado');
        this.nodosNoEjecutadosAplicados.add(id);
      }
    }

    if (this.marcarFinCompletado) {
      for (const element of elements) {
        const bo = element?.businessObject;
        if (!bo?.$instanceOf || !bo.$instanceOf('bpmn:EndEvent')) {
          continue;
        }
        const id = String(bo.id ?? element.id ?? '').trim();
        if (!id) {
          continue;
        }
        canvas.addMarker(id, 'tramite-fin-completado');
        this.nodosFinCompletadosAplicados.add(id);
      }
    }
  }

  private normalizarIds(ids: string[] | null | undefined): string[] {
    if (!Array.isArray(ids)) {
      return [];
    }
    const salida: string[] = [];
    for (const item of ids) {
      const id = String(item ?? '').trim();
      if (!id || salida.includes(id)) {
        continue;
      }
      salida.push(id);
    }
    return salida;
  }

  private asignarNombrePorDefectoTransicion(connection: any): void {
    if (this.mode !== 'modeler' || !this.instance || !connection?.businessObject) {
      return;
    }
    const bo = connection.businessObject;
    if (bo.$type !== 'bpmn:SequenceFlow') {
      return;
    }
    const nombreActual = String(bo.name ?? '').trim();
    if (nombreActual.length > 0 && !/^Flow_/i.test(nombreActual)) {
      return;
    }

    bo.name = 'Texto';
    const modeling = this.instance.get('modeling');
    if (modeling?.updateLabel) {
      try {
        modeling.updateLabel(connection, 'Texto');
      } catch {
        // Ignore label-update command conflicts; the businessObject name remains set.
      }
    }
  }

  private garantizarConexionSequenceFlow(connection: any): boolean {
    if (this.mode !== 'modeler' || !this.instance || !connection?.businessObject) {
      return false;
    }
    const bo = connection.businessObject;
    const esSequenceFlow = bo.$type === 'bpmn:SequenceFlow';
    const origenValido = this.esFlowNodeBpmn(connection.source);
    const destinoValido = this.esFlowNodeBpmn(connection.target);

    if (esSequenceFlow && origenValido && destinoValido) {
      return true;
    }

    const modeling = this.instance.get('modeling');
    if (modeling?.removeConnection) {
      modeling.removeConnection(connection);
    } else if (modeling?.removeElements) {
      modeling.removeElements([connection]);
    }
    return false;
  }

  private esFlowNodeBpmn(element: any): boolean {
    const bo = element?.businessObject;
    return Boolean(bo?.$instanceOf && bo.$instanceOf('bpmn:FlowNode'));
  }

  private emitElementClick(event: any): void {
    const element = event?.element;
    const bo = element?.businessObject;
    const id = String(bo?.id ?? element?.id ?? '').trim();
    const type = String(bo?.$type ?? element?.type ?? '').trim();
    if (!id || !type) {
      return;
    }
    if (this.mode === 'modeler' && this.instance) {
      const contextPad = this.instance.get('contextPad');
      const selection = this.instance.get('selection');
      if (contextPad?.close) {
        contextPad.close();
      }
      if (selection?.select) {
        selection.select([]);
      }
    }
    this.elementClick.emit({
      id,
      type,
      name: String(bo?.name ?? '').trim(),
    });
  }

  private logFlechaEnConsola(event: any): void {
    const info = this.resolveSequenceFlowInfo(event);
    if (!info) {
      return;
    }

    const snapshot = {
      id: info.id,
      type: 'bpmn:SequenceFlow',
      nombre: info.name,
      sourceRefId: String(info.businessObject?.sourceRef?.id ?? info.element?.source?.id ?? ''),
      targetRefId: String(info.businessObject?.targetRef?.id ?? info.element?.target?.id ?? ''),
      waypoints: Array.isArray(info.element?.waypoints)
        ? info.element.waypoints.map((p: any) => ({ x: Number(p?.x ?? 0), y: Number(p?.y ?? 0) }))
        : [],
    };

    console.groupCollapsed(`[BPMN] SequenceFlow click: ${snapshot.id || '(sin-id)'}`);
    console.log('Resumen:', snapshot);
    console.log('businessObject:', info.businessObject);
    console.log('element:', info.element);
    console.groupEnd();
  }

  private emitSequenceFlowClick(event: any): void {
    const info = this.resolveSequenceFlowInfo(event);
    if (!info) {
      return;
    }
    this.elementClick.emit({
      id: info.id,
      type: 'bpmn:SequenceFlow',
      name: info.name,
    });
  }

  private resolveSequenceFlowInfo(event: any): { id: string; name: string; element: any; businessObject: any } | null {
    const element = event?.element;
    const bo = element?.businessObject;
    if (!element || !bo) {
      return null;
    }

    if (bo.$type === 'bpmn:SequenceFlow') {
      return {
        id: String(bo.id ?? element.id ?? '').trim(),
        name: String(bo.name ?? '').trim(),
        element,
        businessObject: bo,
      };
    }

    const labelTarget = element?.labelTarget;
    const targetBo = labelTarget?.businessObject;
    if (targetBo?.$type === 'bpmn:SequenceFlow') {
      return {
        id: String(targetBo.id ?? labelTarget.id ?? '').trim(),
        name: String(targetBo.name ?? '').trim(),
        element: labelTarget,
        businessObject: targetBo,
      };
    }

    return null;
  }

  private registrarEventoUi(accion: string, descripcion: string, metadata: Record<string, unknown>): void {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }
    const payload = {
      accion,
      descripcion,
      resultado: 'EXITO',
      metadata,
    };
    fetch(`${environment.apiUrl}/api/v1/supervision/auditoria/eventos-ui`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }
}


