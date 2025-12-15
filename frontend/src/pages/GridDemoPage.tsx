/**
 * Grid Demo Page
 * STORY-017A: Layout & Grid-System
 *
 * Demo page showcasing the grid system components for testing.
 * Used by Playwright E2E tests to verify responsive behavior.
 */

import React from 'react';
import { Container, Row, Col, Grid, GridItem } from '../components/layout';

/**
 * GridDemoPage Component
 *
 * Demonstrates the 12-column grid system and responsive layouts.
 */
export const GridDemoPage: React.FC = () => {
  return (
    <main className="py-8">
      {/* Container Demo */}
      <section data-testid="container-demo" className="mb-12">
        <Container data-testid="demo-container">
          <h1 className="text-2xl font-bold mb-4">Grid System Demo</h1>
          <p className="text-gray-600 mb-8">
            This page demonstrates the responsive 12-column grid system.
          </p>
        </Container>
      </section>

      {/* 12-Column Grid Demo */}
      <section data-testid="twelve-column-demo" className="mb-12">
        <Container>
          <h2 className="text-xl font-semibold mb-4">12-Column Grid</h2>
          <Row gap="sm">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((col) => (
              <Col key={col} span={1} data-testid={`col-${col}`}>
                <div className="bg-primary-100 p-2 text-center text-sm rounded">
                  {col}
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Responsive Columns Demo */}
      <section data-testid="responsive-demo" className="mb-12">
        <Container>
          <h2 className="text-xl font-semibold mb-4">Responsive Columns</h2>
          {/* Using CSS Grid for better gap handling than flexbox with percentage widths */}
          <Grid cols={1} md={2} lg={3} gap="md">
            <GridItem data-testid="responsive-col-1">
              <div className="bg-blue-100 p-4 rounded h-24 flex items-center justify-center">
                Full → 1/2 → 1/3
              </div>
            </GridItem>
            <GridItem data-testid="responsive-col-2">
              <div className="bg-green-100 p-4 rounded h-24 flex items-center justify-center">
                Full → 1/2 → 1/3
              </div>
            </GridItem>
            <GridItem colSpan={1} colSpanMd={2} colSpanLg={1} data-testid="responsive-col-3">
              <div className="bg-yellow-100 p-4 rounded h-24 flex items-center justify-center">
                Full → Full → 1/3
              </div>
            </GridItem>
          </Grid>
        </Container>
      </section>

      {/* Card Grid Demo */}
      <section data-testid="card-grid-demo" className="mb-12">
        <Container>
          <h2 className="text-xl font-semibold mb-4">Card Grid (CSS Grid)</h2>
          <Grid
            cols={1}
            md={2}
            lg={3}
            gap="lg"
            data-testid="card-grid"
          >
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <GridItem key={card} data-testid={`card-${card}`}>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold mb-2">Card {card}</h3>
                  <p className="text-gray-600 text-sm">
                    This card demonstrates responsive grid layout.
                  </p>
                </div>
              </GridItem>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Nested Grid Demo */}
      <section data-testid="nested-demo" className="mb-12">
        <Container>
          <h2 className="text-xl font-semibold mb-4">Nested Grid</h2>
          {/* Using CSS Grid (12 columns) for better gap handling than flexbox */}
          <Grid cols={1} lg={12} gap="lg">
            <GridItem colSpan={1} colSpanLg={8} data-testid="main-content">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-4">Main Content (8 cols on lg)</h3>
                <Grid cols={1} sm={2} gap="md" data-testid="nested-grid">
                  <GridItem data-testid="nested-item-1">
                    <div className="bg-purple-100 p-4 rounded">Nested 1</div>
                  </GridItem>
                  <GridItem data-testid="nested-item-2">
                    <div className="bg-purple-100 p-4 rounded">Nested 2</div>
                  </GridItem>
                </Grid>
              </div>
            </GridItem>
            <GridItem colSpan={1} colSpanLg={4} data-testid="sidebar">
              <div className="bg-gray-100 p-4 rounded h-full">
                <h3 className="font-semibold mb-2">Sidebar (4 cols on lg)</h3>
                <p className="text-sm text-gray-600">
                  This sidebar takes 4 columns on large screens.
                </p>
              </div>
            </GridItem>
          </Grid>
        </Container>
      </section>

      {/* Spanning Items Demo */}
      <section data-testid="spanning-demo" className="mb-12">
        <Container>
          <h2 className="text-xl font-semibold mb-4">Spanning Items</h2>
          <Grid cols={12} gap="md" data-testid="spanning-grid">
            <GridItem colSpan={12} data-testid="span-full">
              <div className="bg-indigo-100 p-4 rounded text-center">
                Full Width (12 cols)
              </div>
            </GridItem>
            <GridItem colSpan={8} data-testid="span-8">
              <div className="bg-indigo-200 p-4 rounded text-center">
                Main (8 cols)
              </div>
            </GridItem>
            <GridItem colSpan={4} data-testid="span-4">
              <div className="bg-indigo-300 p-4 rounded text-center">
                Side (4 cols)
              </div>
            </GridItem>
            <GridItem colSpan={6} data-testid="span-6-1">
              <div className="bg-indigo-400 p-4 rounded text-center">
                Half (6 cols)
              </div>
            </GridItem>
            <GridItem colSpan={6} data-testid="span-6-2">
              <div className="bg-indigo-500 p-4 rounded text-center text-white">
                Half (6 cols)
              </div>
            </GridItem>
          </Grid>
        </Container>
      </section>

      {/* Breakpoint Indicator */}
      <section data-testid="breakpoint-indicator" className="fixed bottom-4 right-4">
        <div className="bg-black text-white px-3 py-1 rounded text-sm font-mono">
          <span className="sm:hidden">xs (&lt;640px)</span>
          <span className="hidden sm:inline md:hidden">sm (640px+)</span>
          <span className="hidden md:inline lg:hidden">md (768px+)</span>
          <span className="hidden lg:inline xl:hidden">lg (1024px+)</span>
          <span className="hidden xl:inline">xl (1280px+)</span>
        </div>
      </section>
    </main>
  );
};

export default GridDemoPage;
