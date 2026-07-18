import Sprite from 'openfl/display/Sprite';
import Context3D from 'openfl/display3D/Context3D';
import Context3DBlendFactor from 'openfl/display3D/Context3DBlendFactor';
import Context3DMipFilter from 'openfl/display3D/Context3DMipFilter';
import Context3DProgramType from 'openfl/display3D/Context3DProgramType';
import Context3DTextureFilter from 'openfl/display3D/Context3DTextureFilter';
import Context3DTextureFormat from 'openfl/display3D/Context3DTextureFormat';
import Context3DVertexBufferFormat from 'openfl/display3D/Context3DVertexBufferFormat';
import Context3DWrapMode from 'openfl/display3D/Context3DWrapMode';
import IndexBuffer3D from 'openfl/display3D/IndexBuffer3D';
import Program3D from 'openfl/display3D/Program3D';
import VertexBuffer3D from 'openfl/display3D/VertexBuffer3D';
import RectangleTexture from 'openfl/display3D/textures/RectangleTexture';
import Event from 'openfl/events/Event';
import Matrix3D from 'openfl/geom/Matrix3D';
import Assets from 'openfl/utils/Assets';
import Vector from 'openfl/Vector';

class Main extends Sprite {
  private bitmapIndexBuffer!: IndexBuffer3D;
  private bitmapRenderTransform!: Matrix3D;
  private bitmapTexture!: RectangleTexture;
  private bitmapTransform!: Matrix3D;
  private bitmapVertexBuffer!: VertexBuffer3D;
  private program!: Program3D;
  private programMatrixUniform = 0;
  private programTextureAttribute = 0;
  private programVertexAttribute = 0;
  private projectionTransform!: Matrix3D;

  public constructor() {
    super();

    if (this.stage.context3D !== null) {
      this.initialize();
    } else {
      this.stage.stage3Ds[0]!.addEventListener(Event.CONTEXT3D_CREATE, this.initialize);
      this.stage.stage3Ds[0]!.requestContext3D();
    }
  }

  private initialize = (_event?: Event): void => {
    let context: Context3D | null = null;

    if (this.stage.context3D !== null) {
      context = this.stage.context3D;
    } else {
      context = this.stage.stage3Ds[0]!.context3D;
    }

    if (context === null) {
      console.log('Stage does not have a compatible 3D context available');
      return;
    }

    const vertexSource = `attribute vec4 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

uniform mat4 uMatrix;

void main(void) {
  vTexCoord = aTexCoord;
  gl_Position = uMatrix * aPosition;
}`;

    const fragmentSource = `precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uImage0;

void main(void) {
  gl_FragColor = texture2D(uImage0, vTexCoord);
}`;

    this.program = context.createProgram('glsl');
    this.program.uploadSources(vertexSource, fragmentSource);

    this.programVertexAttribute = this.program.getAttributeIndex('aPosition');
    this.programTextureAttribute = this.program.getAttributeIndex('aTexCoord');
    this.programMatrixUniform = this.program.getConstantIndex('uMatrix');

    const bitmapData = Assets.getBitmapData('openfl/assets/openfl.png');
    this.bitmapTexture = context.createRectangleTexture(
      bitmapData.width,
      bitmapData.height,
      Context3DTextureFormat.BGRA,
      false,
    );
    this.bitmapTexture.uploadFromBitmapData(bitmapData);

    const vertexData = Vector.ofArray([
      bitmapData.width,
      bitmapData.height,
      0,
      1,
      1,
      0,
      bitmapData.height,
      0,
      0,
      1,
      bitmapData.width,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);

    this.bitmapVertexBuffer = context.createVertexBuffer(4, 5);
    this.bitmapVertexBuffer.uploadFromVector(vertexData, 0, 4);

    const indexData = Vector.ofArray([0, 1, 2, 2, 1, 3]);
    this.bitmapIndexBuffer = context.createIndexBuffer(6);
    this.bitmapIndexBuffer.uploadFromVector(indexData, 0, 6);

    this.bitmapTransform = new Matrix3D();
    this.bitmapTransform.appendTranslation(100, 100, 0);
    this.projectionTransform = new Matrix3D();
    this.bitmapRenderTransform = new Matrix3D();

    this.resize(this.stage.stageWidth, this.stage.stageHeight);

    this.stage.addEventListener(Event.RESIZE, this.stage_onResize);
    this.stage.addEventListener(Event.RENDER, this.stage_onRender);

    this.render();
  };

  private render(): void {
    this.stage.invalidate();

    const context = this.stage.context3D!;
    context.setProgram(this.program);
    context.setBlendFactors(Context3DBlendFactor.ONE, Context3DBlendFactor.ONE_MINUS_SOURCE_ALPHA);
    context.setTextureAt(0, this.bitmapTexture);
    context.setSamplerStateAt(0, Context3DWrapMode.CLAMP, Context3DTextureFilter.LINEAR, Context3DMipFilter.MIPNONE);
    context.setProgramConstantsFromMatrix(
      Context3DProgramType.VERTEX,
      this.programMatrixUniform,
      this.bitmapRenderTransform,
      false,
    );
    context.setVertexBufferAt(
      this.programVertexAttribute,
      this.bitmapVertexBuffer,
      0,
      Context3DVertexBufferFormat.FLOAT_3,
    );
    context.setVertexBufferAt(
      this.programTextureAttribute,
      this.bitmapVertexBuffer,
      3,
      Context3DVertexBufferFormat.FLOAT_2,
    );
    context.drawTriangles(this.bitmapIndexBuffer);
    context.present();
  }

  private resize(_width: number, _height: number): void {
    this.projectionTransform = new Matrix3D();
    this.projectionTransform.copyRawDataFrom(
      Vector.ofArray([
        2.0 / this.stage.stageWidth,
        0.0,
        0.0,
        0.0,
        0.0,
        -2.0 / this.stage.stageHeight,
        0.0,
        0.0,
        0.0,
        0.0,
        -2.0 / 2000,
        0.0,
        -1.0,
        1.0,
        0.0,
        1.0,
      ]),
    );

    this.bitmapRenderTransform.identity();
    this.bitmapRenderTransform.append(this.bitmapTransform);
    this.bitmapRenderTransform.append(this.projectionTransform);
  }

  private stage_onRender = (_event: Event): void => {
    this.render();
  };

  private stage_onResize = (_event: Event): void => {
    this.resize(this.stage.stageWidth, this.stage.stageHeight);
  };
}

export default Main;
